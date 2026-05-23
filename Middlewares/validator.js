const { body, param, validationResult, matchedData } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const sanitizedBody = matchedData(req, { locations: ['body'] });
  const sanitizedQuery = matchedData(req, { locations: ['query'] });
  const sanitizedParams = matchedData(req, { locations: ['params'] });

  if (Object.keys(sanitizedBody).length > 0) req.body = sanitizedBody;
  if (Object.keys(sanitizedQuery).length > 0) req.query = sanitizedQuery;
  if (Object.keys(sanitizedParams).length > 0) req.params = sanitizedParams;

  next();
};

module.exports = {
  body,
  param,
  validateRequest,
};
