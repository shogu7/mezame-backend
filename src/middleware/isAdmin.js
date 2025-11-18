module.exports = function (req, res, next) {
  // User is connected ?
  if (!req.user) return res.status(401).json({ ok:false, message: 'Not authenticated' });

  // is the user admin? Work with the token that containt a variable, that determine ur user acess
  if (!req.user.is_admin && !req.user.isAdmin && req.user.isAdmin !== 1) {
    return res.status(403).json({ ok:false, message: 'Admin required' });
  }
  next();
};
