const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, errors: error.errors });
  }
};

module.exports = validate;
