async function testPages() {
  const urls = [
    "http://localhost:3000",
    "http://localhost:3000/about",
    "http://localhost:3000/privacy",
    "http://localhost:3000/terms",
    "http://localhost:3000/contact",
    "http://localhost:3000/discover",
    "http://localhost:3000/sitemap.xml",
    "http://localhost:3000/robots.txt",
    "http://localhost:3000/non-existent-page-404",
  ];

  console.log("=== ROTAZUR SAYFA & YÖNLENDİRME TESTLERİ ===");
  for (const url of urls) {
    try {
      const res = await fetch(url);
      console.log(`[${res.status}] ${url}`);
    } catch (err) {
      console.log(`[HATA] ${url}:`, err.message);
    }
  }

  console.log("\n=== ROTAZUR API & FORM TESTLERİ ===");
  // Test Contact form API
  try {
    const contactRes = await fetch("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Kullanıcı",
        email: "test@rotazur.com",
        subject: "Genel Soru & Bilgi Talebi",
        message: "Bu bir otomatik web tasarım ve form iletim testidir.",
      }),
    });
    const cData = await contactRes.json();
    console.log(`[Contact API ${contactRes.status}]:`, cData);
  } catch (err) {
    console.log("[Contact API Hata]:", err.message);
  }

  // Test Newsletter form API
  try {
    const newsRes = await fetch("http://localhost:3000/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "gezgin@rotazur.com",
        locale: "tr",
      }),
    });
    const nData = await newsRes.json();
    console.log(`[Newsletter API ${newsRes.status}]:`, nData);
  } catch (err) {
    console.log("[Newsletter API Hata]:", err.message);
  }
}

testPages();
