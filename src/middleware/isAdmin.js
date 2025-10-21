module.exports = function (req, res, next) {
  if (!req.user) return res.status(401).json({ ok:false, message: 'Not authenticated' });
  if (!req.user.is_admin && !req.user.isAdmin && req.user.isAdmin !== 1) {
    return res.status(403).json({ ok:false, message: 'Admin required' });
  }
  next();
};
