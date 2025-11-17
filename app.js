const express = require("express");

app.use((req, res, next) => {
  // jika request menginginkan JSON (API request), kirim JSON
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(404).json({ ok:false, message: 'Not Found' });
  }

  // render view 404.ejs; jika kamu letakkan di views/public/404.ejs, gunakan 'public/404'
  return res.status(404).render('public/404', { url: req.originalUrl, user: req.session?.user || null });
});
// Menjalankan Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;