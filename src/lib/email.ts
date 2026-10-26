import crypto from "node:crypto";
import nodemailer from "nodemailer";

/**
 * 6 haneli güvenli rastgele doğrulama kodu üretir
 */
export function generateOtpCode(): string {
  const num = crypto.randomInt(100000, 999999);
  return num.toString();
}

export interface SendEmailResult {
  success: boolean;
  realEmailSent: boolean;
  devCode?: string;
  error?: string;
}

/**
 * E-posta taşıyıcısı (transporter) oluşturur
 */
function getTransporter() {
  const fromName = (process.env.EMAIL_FROM_NAME || process.env.APP_NAME || "Rotazur").trim();
  const gmailUser = (process.env.GMAIL_USER || process.env.EMAIL_USER || "").trim();
  const rawPass = (process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS || "").trim();
  // Google 16 haneli uygulama şifrelerini 4'lü boşluklarla verir (örn: "abcd efgh ijkl mnop"), boşlukları temizle:
  const gmailPass = rawPass.replace(/\s+/g, "");

  if (gmailUser && gmailPass) {
    const fromAddress = process.env.EMAIL_FROM || gmailUser;
    return {
      transporter: nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      }),
      from: `"${fromName}" <${fromAddress}>`,
      fromName,
    };
  }

  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();

  if (smtpHost && smtpUser && smtpPass) {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    return {
      transporter: nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      }),
      from: `"${fromName}" <${process.env.SMTP_FROM || smtpUser}>`,
      fromName,
    };
  }

  return null;
}

/**
 * Yeni Üyelik Kayıt Doğrulama Kodunu E-posta ile Gönderir
 */
export async function sendVerificationEmail(
  toEmail: string,
  code: string,
  name: string
): Promise<SendEmailResult> {
  const isDev = process.env.NODE_ENV !== "production";

  // Konsola geliştirici/terminal logu
  if (isDev) {
  console.log(`
┌────────────────────────────────────────────────────────┐
│  📧 ROTAZUR - KAYIT DOĞRULAMA KODU                    │
├────────────────────────────────────────────────────────┤
│  Alıcı : ${toEmail.padEnd(46, " ")}│
│  İsim  : ${name.padEnd(46, " ")}│
│  Kod   : [ ${code} ]                                  │
│  Süre  : 10 Dakika                                     │
└────────────────────────────────────────────────────────┘
  `);
  }

  const mailConfig = getTransporter();
  let realEmailSent = false;

  if (mailConfig) {
    try {
      await mailConfig.transporter.sendMail({
        from: mailConfig.from,
        to: toEmail,
        subject: `${code} - Rotazur Doğrulama Kodunuz`,
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b1120; color: #f1f5f9; padding: 20px; }
            .container { max-width: 520px; margin: 0 auto; background: #0f172a; border-radius: 16px; border: 1px solid #1e293b; padding: 36px 28px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .badge { display: inline-block; padding: 6px 14px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 9999px; color: #38bdf8; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
            h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; }
            p { font-size: 15px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0; }
            .otp-box { background: #1e293b; border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
            .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace; }
            .expiry { font-size: 13px; color: #cbd5e1; margin-top: 8px; }
            .footer { font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 20px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">✈️ Rotazur</div>
            <h1>Hesabınızı Doğrulayın</h1>
            <p>Merhaba <strong>${name}</strong>,<br>Rotazur'a hoş geldiniz! Hesabınızı güvenle oluşturmak ve e-posta adresinizi onaylamak için aşağıdaki 6 haneli doğrulama kodunu kullanın:</p>
            
            <div class="otp-box">
              <div class="otp-code">${code}</div>
              <div class="expiry">⏱️ Bu kod <strong>10 dakika</strong> boyunca geçerlidir.</div>
            </div>

            <p style="font-size: 13px;">Bu hesabı siz oluşturmadıysanız bu e-postayı güvenle silebilirsiniz.</p>
            
            <div class="footer">
              Bu otomatik bir e-postadır, lütfen yanıtlamayınız.<br>
              © ${new Date().getFullYear()} Rotazur • Your Travel Route
            </div>
          </div>
        </body>
        </html>
        `,
      });
      realEmailSent = true;
      console.log(`[Email] Doğrulama kodu ${toEmail} adresine başarıyla gönderildi.`);
    } catch (err: unknown) {
      console.error("[Email] Gerçek e-posta gönderim hatası:", err);
    }
  }

    return {
      success: true,
      realEmailSent,
      devCode: realEmailSent ? undefined : (isDev ? code : undefined),
    };
}

/**
 * Şifre Sıfırlama Kodunu E-posta ile Gönderir
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  code: string,
  name: string
): Promise<SendEmailResult> {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
  console.log(`
┌────────────────────────────────────────────────────────┐
│  🔑 ROTAZUR - ŞİFRE SIFIRLAMA KODU                    │
├────────────────────────────────────────────────────────┤
│  Alıcı : ${toEmail.padEnd(46, " ")}│
│  İsim  : ${name.padEnd(46, " ")}│
│  Kod   : [ ${code} ]                                  │
│  Süre  : 10 Dakika                                     │
└────────────────────────────────────────────────────────┘
  `);
  }

  const mailConfig = getTransporter();
  let realEmailSent = false;

  if (mailConfig) {
    try {
      await mailConfig.transporter.sendMail({
        from: mailConfig.from,
        to: toEmail,
        subject: `${code} - Rotazur Şifre Sıfırlama Kodunuz`,
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b1120; color: #f1f5f9; padding: 20px; }
            .container { max-width: 520px; margin: 0 auto; background: #0f172a; border-radius: 16px; border: 1px solid #1e293b; padding: 36px 28px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .badge { display: inline-block; padding: 6px 14px; background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.25); border-radius: 9999px; color: #fb7185; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
            h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; }
            p { font-size: 15px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0; }
            .otp-box { background: #1e293b; border: 2px dashed #e11d48; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
            .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #fb7185; font-family: monospace; }
            .expiry { font-size: 13px; color: #cbd5e1; margin-top: 8px; }
            .footer { font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 20px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">🔒 Rotazur Güvenlik</div>
            <h1>Şifrenizi Sıfırlayın</h1>
            <p>Merhaba <strong>${name}</strong>,<br>Rotazur hesabınız için bir şifre sıfırlama talebinde bulunuldu. Şifrenizi yenilemek için aşağıdaki 6 haneli güvenlik kodunu girin:</p>
            
            <div class="otp-box">
              <div class="otp-code">${code}</div>
              <div class="expiry">⏱️ Bu kod <strong>10 dakika</strong> boyunca geçerlidir.</div>
            </div>

            <p style="font-size: 13px;">Bu şifre sıfırlama talebini siz yapmadıysanız lütfen bu e-postayı dikkate almayın. Hesabınızın güvenliği korunmaktadır.</p>
            
            <div class="footer">
              Bu otomatik bir e-postadır, lütfen yanıtlamayınız.<br>
              © ${new Date().getFullYear()} Rotazur • Your Travel Route
            </div>
          </div>
        </body>
        </html>
        `,
      });
      realEmailSent = true;
      console.log(`[Email] Şifre sıfırlama kodu ${toEmail} adresine başarıyla gönderildi.`);
    } catch (err: unknown) {
      console.error("[Email] Şifre sıfırlama e-posta gönderim hatası:", err);
    }
  }

  return {
    success: true,
    realEmailSent,
    devCode: realEmailSent ? undefined : (isDev ? code : undefined),
  };
}

export interface ItineraryEmailPayload {
  toEmail: string;
  cityName: string;
  country: string;
  flag: string;
  datesText: string;
  travelers: number;
  budgetTier: string;
  totalCostText: string;
  flightSummary: string;
  hotelSummary: string;
  restaurantsSummary: string[];
  daysSummary: { dayTitle: string; items: string[] }[];
  planUrl: string;
}

export interface SendItineraryResult {
  ok: boolean;
  realEmailSent: boolean;
  simulated?: boolean;
  recipient: string;
  html: string;
  message?: string;
  error?: string;
}

/**
 * Seyahat planı için tam uyumlu, şık ve mobil dostu HTML e-posta şablonu oluşturur
 */
export function renderItineraryHtml(payload: ItineraryEmailPayload): string {
  const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
  let planUrl = "https://rotazur.com/";
  try {
    const candidate = new URL(payload.planUrl);
    const allowedOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://rotazur.com").origin;
    if (candidate.origin === allowedOrigin && ["https:", "http:"].includes(candidate.protocol)) planUrl = candidate.href;
  } catch { /* Invalid or executable URLs are never interpolated into the email. */ }
  payload = {
    ...payload,
    cityName: escape(payload.cityName), country: escape(payload.country), flag: escape(payload.flag),
    datesText: escape(payload.datesText), budgetTier: escape(payload.budgetTier),
    totalCostText: escape(payload.totalCostText), flightSummary: escape(payload.flightSummary), hotelSummary: escape(payload.hotelSummary),
    travelers: Math.min(9, Math.max(1, Math.trunc(Number(payload.travelers)) || 1)),
    restaurantsSummary: Array.isArray(payload.restaurantsSummary) ? payload.restaurantsSummary.slice(0, 30).map(escape) : [],
    daysSummary: Array.isArray(payload.daysSummary) ? payload.daysSummary.slice(0, 15).map((day) => ({
      dayTitle: escape(day?.dayTitle), items: Array.isArray(day?.items) ? day.items.slice(0, 40).map(escape) : [],
    })) : [],
    planUrl: escape(planUrl),
  };
  const restList = Array.isArray(payload.restaurantsSummary) ? payload.restaurantsSummary : [];
  const restHtml = restList.length > 0
    ? restList
        .map((r) => `<li style="margin-bottom:8px;color:#cbd5e1;font-size:13px;line-height:1.5;">${String(r)}</li>`)
        .join("")
    : `<li style="color:#94a3b8;font-size:13px;">Seçilen bütçe moduna göre yerel lezzet durakları planda listelenmiştir.</li>`;

  const daysList = Array.isArray(payload.daysSummary) ? payload.daysSummary : [];
  const daysHtml = daysList
    .map((d) => {
      const items = Array.isArray(d?.items) ? d.items : [];
      return `
      <div style="background:#1e293b;border-radius:12px;padding:16px 18px;margin-bottom:14px;border:1px solid #334155;">
        <div style="font-weight:700;color:#c4b5fd;font-size:14px;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
          <span>📅</span> <span>${d?.dayTitle || "Gezi Programı"}</span>
        </div>
        <ul style="margin:0;padding-left:18px;color:#e2e8f0;font-size:13px;line-height:1.6;">
          ${items.map((it) => `<li style="margin-bottom:6px;">${String(it)}</li>`).join("")}
        </ul>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${payload.flag} ${payload.cityName} Seyahat Rotanız</title>
</head>
<body style="margin:0;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#0b1120;color:#f1f5f9;">
  <div style="max-width:620px;margin:0 auto;background-color:#0f172a;border-radius:20px;border:1px solid #1e293b;padding:32px 24px;box-shadow:0 12px 30px rgba(0,0,0,0.5);">
    
    <!-- Üst Başlık & Rozet -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;padding:6px 16px;background:rgba(124,77,255,0.18);border:1px solid rgba(124,77,255,0.35);border-radius:9999px;color:#c4b5fd;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
        ✈️ ROTAZUR • DİJİTAL CEP REHBERİNİZ
      </div>
      <h1 style="font-size:26px;font-weight:900;color:#ffffff;margin:16px 0 8px 0;line-height:1.2;">
        ${payload.flag} ${payload.cityName}, ${payload.country}
      </h1>
      <div style="font-size:14px;color:#94a3b8;font-weight:500;">
        🗓️ ${payload.datesText} &nbsp;•&nbsp; 👥 ${payload.travelers} Kişi &nbsp;•&nbsp; 🎚️ <strong>${payload.budgetTier.toUpperCase()} Modu</strong>
      </div>
    </div>

    <!-- Bütçe & Özet Kartı -->
    <div style="background:linear-gradient(135deg,#131f37 0%,#1e293b 100%);border-radius:16px;padding:20px 22px;margin-bottom:24px;border:1px solid #334155;">
      <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;">
        Tahmini Toplam Seyahat Maliyeti
      </div>
      <div style="font-size:28px;font-weight:900;color:#34d399;margin-top:4px;letter-spacing:-0.5px;">
        ${payload.totalCostText}
      </div>
      
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.08);font-size:13px;color:#e2e8f0;line-height:1.6;">
        <div style="margin-bottom:6px;">
          <strong style="color:#38bdf8;">✈️ Uçuş:</strong> ${payload.flightSummary}
        </div>
        <div>
          <strong style="color:#fbbf24;">🏨 Konaklama:</strong> ${payload.hotelSummary}
        </div>
      </div>
    </div>

    <!-- Restoranlar -->
    <div style="margin-bottom:24px;">
      <h2 style="font-size:16px;font-weight:800;color:#f8fafc;margin:0 0 12px 0;">
        🍽️ Önerilen Restoran & Lezzet Durakları
      </h2>
      <ul style="margin:0;padding-left:20px;">
        ${restHtml}
      </ul>
    </div>

    <!-- Gün Gün Rota Planı -->
    <div style="margin-bottom:28px;">
      <h2 style="font-size:16px;font-weight:800;color:#f8fafc;margin:0 0 14px 0;">
        🗺️ Gün Gün Gezi & Etkinlik Programı
      </h2>
      ${daysHtml}
    </div>

    <!-- Canlı Plan Bağlantısı Butonu -->
    <div style="text-align:center;margin:32px 0 20px 0;">
      <a href="${payload.planUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#7c4dff;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:14px 28px;border-radius:14px;box-shadow:0 4px 16px rgba(124,77,255,0.4);">
        Canlı Haritalı Rotayı Sitede Aç →
      </a>
      <div style="margin-top:10px;font-size:11px;color:#64748b;">
        Tüm harita pinlerini, alternatif uçuşları ve rezervasyon bağlantılarını inceleyin.
      </div>
    </div>

    <!-- Alt Bilgi -->
    <div style="font-size:12px;color:#64748b;border-top:1px solid #1e293b;padding-top:20px;margin-top:28px;text-align:center;line-height:1.6;">
      Bu seyahat rehberi <strong>Rotazur</strong> tarafından ücretsiz olarak oluşturulmuştur.<br>
      © 2026 Rotazur • Akıllı & Bağımsız Seyahat Asistanı
    </div>

  </div>
</body>
</html>`;
}

export async function sendItineraryEmail(payload: ItineraryEmailPayload): Promise<SendItineraryResult> {
  const html = renderItineraryHtml(payload);
  const mailConfig = getTransporter();

  // SMTP yapılandırılmamışsa simülasyon modunda güvenle çalışır, hata fırlatmaz
  if (!mailConfig) {
    console.log(`
┌────────────────────────────────────────────────────────┐
│  ✈️ ROTAZUR - CEP REHBERİ E-POSTASI                    │
├────────────────────────────────────────────────────────┤
│  Alıcı : ${payload.toEmail.padEnd(46, " ")}│
│  Şehir : ${(payload.cityName + " (" + payload.country + ")").padEnd(46, " ")}│
│  Durum : SMTP yapılandırılmadı (Önizleme/Simülasyon)   │
└────────────────────────────────────────────────────────┘
    `);

    return {
      ok: true,
      realEmailSent: false,
      simulated: true,
      recipient: payload.toEmail,
      html,
      message: "E-posta şablonunuz başarıyla oluşturuldu! Canlı SMTP tanımlanana kadar önizleme sekmesinden açabilirsiniz.",
    };
  }

  try {
    await mailConfig.transporter.sendMail({
      from: mailConfig.from,
      to: payload.toEmail,
      subject: `${payload.flag} ${payload.cityName} (${payload.country}) Seyahat Rotanız & Bütçe Özeti`,
      html,
    });

    console.log(`[Email] Plan cep rehberi ${payload.toEmail} adresine başarıyla gönderildi.`);
    return {
      ok: true,
      realEmailSent: true,
      simulated: false,
      recipient: payload.toEmail,
      html,
      message: "E-posta başarıyla iletildi!",
    };
  } catch (err: unknown) {
    console.error("[Email] Plan gönderme hatası:", err);
    const rawMsg = (err as Error)?.message || "";
    let friendlyError = "E-posta gönderilemedi.";

    if (rawMsg.includes("EAUTH") || rawMsg.includes("Username and Password not accepted") || rawMsg.includes("Invalid login")) {
      friendlyError = "Gmail kimlik doğrulama başarısız oldu: Google hesabınızda 2 Adımlı Doğrulama ve 16 haneli 'Uygulama Şifresi' (.env.local içindeki GMAIL_APP_PASSWORD) geçerli olmalıdır.";
    } else if (rawMsg) {
      friendlyError = `E-posta sunucusu hatası: ${rawMsg}`;
    }

    return {
      ok: false,
      realEmailSent: false,
      simulated: false,
      recipient: payload.toEmail,
      html,
      error: friendlyError,
    };
  }
}

export interface PriceAlertEmailPayload {
  toEmail: string;
  cityName: string;
  country: string;
  flag: string;
  targetPriceTry: number;
  currentPriceTry: number;
  bookingUrl: string;
  airline?: string;
  datesText?: string;
}

export async function sendPriceAlertEmail(
  payload: PriceAlertEmailPayload
): Promise<{ ok: boolean; realEmailSent: boolean; simulated?: boolean; error?: string }> {
  const mailConfig = getTransporter();
  if (!mailConfig) {
    console.log(`[Email] Fiyat alarmı simülasyonu: ${payload.toEmail} için ${payload.cityName} (${payload.currentPriceTry} TL) - SMTP ayarlanmamış.`);
    return {
      ok: true,
      realEmailSent: false,
      simulated: true,
    };
  }

  try {
    const savings = Math.max(0, payload.targetPriceTry - payload.currentPriceTry);

    await mailConfig.transporter.sendMail({
      from: mailConfig.from,
      to: payload.toEmail,
      subject: `🎉 Fiyat Düştü! ${payload.flag} ${payload.cityName} Uçuşu Şimdi ${payload.currentPriceTry.toLocaleString("tr-TR")} ₺!`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0b1120;color:#f1f5f9;padding:20px;">
        <div style="max-width:540px;margin:0 auto;background:#0f172a;border-radius:18px;border:1px solid #1e293b;padding:32px 24px;">
          <div style="display:inline-block;padding:6px 14px;background:rgba(16,185,129,0.15);border-radius:9999px;color:#34d399;font-size:12px;font-weight:700;margin-bottom:14px;">
            🔔 FİYAT ALARMI BİLDİRİMİ
          </div>
          <h1 style="font-size:24px;font-weight:800;color:#ffffff;margin:0 0 8px 0;">
            Müjde! ${payload.flag} ${payload.cityName} Fiyatı Düştü!
          </h1>
          <p style="font-size:14px;color:#94a3b8;margin:0 0 20px 0;">
            Beklediğiniz ${payload.cityName} (${payload.country}) uçak bileti hedeflediğiniz fiyat seviyesinin altına indi.
          </p>

          <div style="background:#1e293b;border-radius:14px;padding:20px;margin-bottom:20px;border:1px solid #334155;text-align:center;">
            <div style="font-size:13px;color:#94a3b8;">Canlı Bilet Fiyatı</div>
            <div style="font-size:36px;font-weight:900;color:#34d399;margin:6px 0;">
              ${payload.currentPriceTry.toLocaleString("tr-TR")} ₺
            </div>
            <div style="font-size:13px;color:#cbd5e1;">
              Hedef Fiyatınız: <s>${payload.targetPriceTry.toLocaleString("tr-TR")} ₺</s> 
              ${savings > 0 ? `· <b>${savings.toLocaleString("tr-TR")} ₺ daha ucuz!</b>` : ""}
            </div>
            ${payload.airline ? `<div style="font-size:12px;color:#94a3b8;margin-top:8px;">✈️ Havayolu: <b>${payload.airline}</b></div>` : ""}
            ${payload.datesText ? `<div style="font-size:12px;color:#94a3b8;">🗓️ Tarihler: <b>${payload.datesText}</b></div>` : ""}
          </div>

          <div style="text-align:center;margin-top:24px;">
            <a href="${payload.bookingUrl}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 28px;border-radius:12px;box-shadow:0 4px 15px rgba(16,185,129,0.3);">
              Bileti Canlı İncele & Satın Al →
            </a>
          </div>

          <div style="font-size:12px;color:#64748b;border-top:1px solid #1e293b;padding-top:18px;margin-top:28px;text-align:center;">
            Bu bildirim kurduğunuz fiyat alarmı gereğince gönderilmiştir.<br>© ${new Date().getFullYear()} Rotazur · Your Travel Route
          </div>
        </div>
      </body>
      </html>
      `,
    });

    return { ok: true, realEmailSent: true };
  } catch (err: unknown) {
    console.error("[Email] Fiyat alarmı e-posta hatası:", err);
    return { ok: false, realEmailSent: false, error: (err as Error)?.message || "E-posta gönderilemedi" };
  }
}


