const validateIdParam = (paramName) => (req, res, next) => {
  const raw = req.params?.[paramName];
  const id = Number(raw);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${paramName}`,
    });
  }

  req.params[paramName] = String(id);
  return next();
};

module.exports = {
  validateIdParam,
};
