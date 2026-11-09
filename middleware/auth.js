const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authorization = req.get('Authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication is required for this action.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Your session is invalid or has expired. Please sign in again.' });
  }
}

module.exports = { requireAuth };

