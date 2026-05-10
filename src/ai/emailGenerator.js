// src/ai/emailGenerator.js
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const generateEmailBody = async ({
  subject,
  tone,
  selectedFields = [],
  fieldValues = {},
}) => {
  try {
    console.log("📧 Generating email with Groq:", { subject, tone });

    // Build the personalization fields list - ONLY from user input
    let fieldsList = "";
    const fieldsToUse = selectedFields.filter((f) => f !== "fromName");

    if (fieldsToUse.length > 0) {
      fieldsList = fieldsToUse
        .map((field) => {
          const value = fieldValues[field] || `[${field}]`;
          return `- ${field}: ${value}`;
        })
        .join("\n");
    }

    // Build greeting using ONLY provided toName
    let greeting = "Hello";
    if (fieldValues.toName) {
      greeting = `Dear ${fieldValues.toName}`;
    }

    // Create a strict prompt that prohibits invented content
    const systemPrompt = `You are an email writer. CRITICAL RULES:
1. ONLY use the exact personalization fields provided below
2. DO NOT invent any company names, dates, or information not provided
3. If a field is missing or shows as [FieldName], use a generic placeholder
4. DO NOT add fictional details like "Zenith Technologies" or any other invented names
5. Use ONLY what is explicitly given to you
6. Return ONLY the email body text, no explanations, no JSON`;

    const userPrompt = `Write a ${tone} email about: "${subject}"

From: ${fieldValues.fromName || "Team"}

EXACT personalization fields to use (use these exact values, do not invent):
${fieldsList || "No personalization fields provided"}

Email structure:
1. Greeting: "${greeting},"
2. Body: Write naturally about the subject
3. If you have fields like companyName, use the EXACT value provided
4. If you have fields like date, use the EXACT date provided
5. DO NOT add any company names, dates, or details that were not provided above
6. Closing: "Best regards,\n${fieldValues.fromName || "Team"}"

Write the email body:`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5, // Lower temperature for more predictable output
      max_tokens: 500,
    });

    let generatedText = completion.choices[0]?.message?.content || "";
    let cleanBody = generatedText.trim();

    // Remove any markdown
    cleanBody = cleanBody.replace(/```[\s\S]*?```/g, "");

    // Ensure placeholders are preserved as [FieldName] format
    fieldsToUse.forEach((field) => {
      const fieldValue = fieldValues[field];
      if (!fieldValue || fieldValue === `[${field}]`) {
        // If field has no value, ensure it stays as placeholder
        const regex = new RegExp(
          `(?:Zenith Technologies|Acme Corp|Example Company|Random Company)`,
          "gi",
        );
        cleanBody = cleanBody.replace(regex, `[${field}]`);
      }
    });

    const htmlBody = cleanBody.replace(/\n/g, "<br/>");

    return { bodyText: cleanBody, bodyHtml: htmlBody };
  } catch (error) {
    console.error("❌ Groq generation error:", error);
    throw new Error(`Failed to generate email: ${error.message}`);
  }
};

const suggestFields = async (subject) => {
  try {
    const systemPrompt = `Suggest ONLY the most relevant personalization fields for an email subject.
Return ONLY a JSON array of field names, no explanations.
Common fields: toName, companyName, productName, date, time, amount, location.
Do not suggest more than 5 fields.`;

    const userPrompt = `Subject: "${subject}"
What personalization fields would be useful? Return only a JSON array of field names.`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 150,
    });

    let suggestedFields =
      completion.choices[0]?.message?.content || '["toName"]';
    const jsonMatch = suggestedFields.match(/\[[\s\S]*?\]/);

    if (jsonMatch) {
      suggestedFields = JSON.parse(jsonMatch[0]);
    } else {
      suggestedFields = ["toName"];
    }

    // Limit to 5 fields and ensure they're valid
    suggestedFields = suggestedFields
      .slice(0, 5)
      .filter((f) =>
        [
          "toName",
          "companyName",
          "productName",
          "date",
          "time",
          "amount",
          "location",
          "deadline",
          "phone",
          "website",
        ].includes(f),
      );

    console.log("✅ Suggested fields:", suggestedFields);
    return suggestedFields;
  } catch (error) {
    console.error("❌ Groq suggest fields error:", error);
    return ["toName"];
  }
};

const regenerateEmail = async ({
  previousBody,
  subject,
  tone,
  feedback,
  fieldValues = {},
}) => {
  try {
    const systemPrompt = `Improve the email based on user feedback.
CRITICAL: ONLY use the exact personalization fields provided. DO NOT invent any company names, dates, or details.
Return ONLY the improved email body text.`;

    const userPrompt = `Subject: "${subject}"
Tone: ${tone}
Feedback: "${feedback}"

Previous email:
${previousBody}

Please regenerate the email addressing this feedback. Keep the same tone and ONLY use the provided fields.

Improved email body:`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      max_tokens: 500,
    });

    const generatedText = completion.choices[0]?.message?.content || "";
    let cleanBody = generatedText.trim();
    const htmlBody = cleanBody.replace(/\n/g, "<br/>");

    return { bodyText: cleanBody, bodyHtml: htmlBody };
  } catch (error) {
    console.error("❌ Groq regeneration error:", error);
    throw new Error(`Failed to regenerate: ${error.message}`);
  }
};

module.exports = {
  generateEmailBody,
  suggestFields,
  regenerateEmail,
};
