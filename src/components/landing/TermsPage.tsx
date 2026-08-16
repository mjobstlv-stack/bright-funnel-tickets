import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/eventos-logo.svg.asset.json";

export function TermsPage({ lang }: { lang: "he" | "en" }) {
  const isHe = lang === "he";
  const c = isHe ? he : en;
  return (
    <div
      dir={isHe ? "rtl" : "ltr"}
      lang={lang}
      className="min-h-screen bg-cream text-ink font-sans"
    >
      <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur-xl border-b border-ink/10">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoAsset.url} alt="Event OS" className="h-9" />
          </Link>
          <Link
            to={isHe ? "/en/terms" : "/terms"}
            className="text-sm text-ink/70 hover:text-ink transition"
          >
            {isHe ? "English" : "עברית"}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 sm:px-8 py-16 sm:py-24">
        <h1 className="font-display text-4xl sm:text-5xl leading-tight uppercase mb-6">
          {c.title}
        </h1>
        <p className="text-sm text-ink/60 mb-12">{c.lastUpdated}</p>

        <div className="space-y-10">
          {c.sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-display text-2xl mb-3">{s.title}</h2>
              <div className="text-ink/80 leading-relaxed space-y-3">
                {s.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-ink/15">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-leaf transition"
          >
            {c.back}
          </Link>
        </div>
      </main>

      <footer className="border-t border-ink/15 bg-cream">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 text-xs text-ink/60">{c.footer}</div>
      </footer>
    </div>
  );
}

const he = {
  title: "תנאי שימוש",
  lastUpdated: "עודכן לאחרונה: 30 ביולי 2026",
  back: "חזרה לדף הבית",
  footer: "© 2026 Event OS. כל הזכויות שמורות.",
  sections: [
    {
      title: "1. כללי",
      paragraphs: [
        `ברוכים הבאים ל-Event OS. תנאי השימוש הללו חלים על כל שימוש במערכת, ביישום, באתר ובשירותים הנלווים (להלן: "השירות"). על ידי הרשמה או שימוש בשירות, אתם מסכימים לתנאים אלה במלואם. אם אינכם מסכימים, אנא הימנעו משימוש בשירות.`,
      ],
    },
    {
      title: "2. חשבונות וגישה",
      paragraphs: [
        "המשתמש אחראי לשמור על סודיות פרטי ההתחברות שלו. אסור לשתף חשבונות או להעביר גישה לצד שלישי. כל פעולה שתבוצע באמצעות החשבון שלכם תחשב כפעולה שאישרתם. אנו שומרים לעצמנו את הזכות להשעות חשבון שמפיר תנאים אלה או שמציג פעילות חשודה.",
      ],
    },
    {
      title: "3. שימוש מותר",
      paragraphs: [
        "השירות נועד לניהול אירועים, מסעדות, צוות, מלאי וכספים. אסור להשתמש בשירות לפעילות בלתי חוקית, הונאה, הטרדה, הפרת זכויות יוצרים, או כל שימוש שעלול לפגוע במערכת או במשתמשים אחרים. אנו רשאים להגביל או לחסום שימוש שאינו עומד בתנאים אלה.",
      ],
    },
    {
      title: "4. תשלומים ומנויים",
      paragraphs: [
        "תוכניות בתשלום מתחייבות לפי המחיר המוצג בעת הרכישה. ניתן לבטל את המנוי בכל עת דרך הגדרות החשבון. אין החזרים כספיים לתקופה ששולמה כבר, אלא אם נאמר אחרת במפורש. ייתכן שיוחלו שינויי מחירים במעמד חידוש המנוי.",
      ],
    },
    {
      title: "5. אבטחה ופרטיות",
      paragraphs: [
        "אנו נוקטים באמצעי אבטחה סבירים להגנת המידע. עם זאת, השימוש בשירות הוא על אחריות המשתמש. אנו ממליצים להפעיל אימות דו-שלבי ולשמור על סיסמאות חזקות. מדיניות הפרטיות שלנו מסבירה כיצד אנו אוספים, משתמשים ושומרים על מידע אישי.",
      ],
    },
    {
      title: "6. קניין רוחני",
      paragraphs: [
        "כל התוכן, העיצוב, הקוד והמותג של Event OS הם קניינו של Event OS או של מחזיקי הרישיונות שלו. אין להעתיק, לשכפל, לשנות או להפיץ חלקים מהשירות ללא אישור מפורש. מידע שתעלו למערכת שייך לכם, ואנו לא נעשה בו שימוש מסחרי ללא הסכמתכם.",
      ],
    },
    {
      title: "7. הגבלת אחריות",
      paragraphs: [
        `השירות מסופק "כפי שהוא". אנו לא נישא באחריות לנזקים ישירים, עקיפים או מיוחדים הנובעים מהשימוש או מאי-השימוש בשירות. במידה המרבית המותרת בחוק, אחריותנו מוגבלת לסכום ששולם על ידכם עבור השירות ב-12 החודשים הקודמים.`,
      ],
    },
    {
      title: "8. שינויים בתנאים",
      paragraphs: [
        "אנו רשאים לעדכן את תנאי השימוש מעת לעת. נודיע על שינויים מהותיים באמצעות הודעה במערכת או במייל. המשך השימוש בשירות לאחר עדכון מהווה הסכמה לתנאים המעודכנים.",
      ],
    },
    {
      title: "9. יצירת קשר",
      paragraphs: [
        "לשאלות או בקשות בנוגע לתנאים אלה, ניתן לפנות אלינו דרך תיאום דמו או דרך הודעה בתוך המערכת ללקוחות Pro ו-Agency.",
      ],
    },
  ],
};

const en = {
  title: "Terms of Service",
  lastUpdated: "Last updated: July 30, 2026",
  back: "Back to home",
  footer: "© 2026 Event OS. All rights reserved.",
  sections: [
    {
      title: "1. General",
      paragraphs: [
        `Welcome to Event OS. These terms of service apply to all use of the system, application, website and related services (the "Service"). By registering or using the Service, you agree to these terms in full. If you do not agree, please refrain from using the Service.`,
      ],
    },
    {
      title: "2. Accounts and access",
      paragraphs: [
        "You are responsible for maintaining the confidentiality of your login credentials. Sharing accounts or transferring access to third parties is prohibited. Any action performed through your account will be considered authorized by you. We reserve the right to suspend accounts that violate these terms or show suspicious activity.",
      ],
    },
    {
      title: "3. Permitted use",
      paragraphs: [
        "The Service is intended for managing events, restaurants, staff, inventory and finances. You may not use the Service for illegal activity, fraud, harassment, copyright infringement, or any use that may harm the system or other users. We may restrict or block usage that does not comply with these terms.",
      ],
    },
    {
      title: "4. Payments and subscriptions",
      paragraphs: [
        "Paid plans are billed according to the price displayed at purchase. You may cancel your subscription at any time through your account settings. No refunds are provided for periods already paid, unless explicitly stated otherwise. Prices may change upon renewal.",
      ],
    },
    {
      title: "5. Security and privacy",
      paragraphs: [
        "We employ reasonable security measures to protect your information. However, use of the Service is at your own risk. We recommend enabling two-factor authentication and using strong passwords. Our privacy policy explains how we collect, use and safeguard personal information.",
      ],
    },
    {
      title: "6. Intellectual property",
      paragraphs: [
        "All content, design, code and branding of Event OS are the property of Event OS or its licensors. You may not copy, reproduce, modify or distribute parts of the Service without explicit permission. Content you upload to the system belongs to you, and we will not use it commercially without your consent.",
      ],
    },
    {
      title: "7. Limitation of liability",
      paragraphs: [
        `The Service is provided "as is". We are not liable for direct, indirect or special damages arising from the use or inability to use the Service. To the maximum extent permitted by law, our liability is limited to the amount you paid for the Service in the preceding 12 months.`,
      ],
    },
    {
      title: "8. Changes to terms",
      paragraphs: [
        "We may update these terms of service from time to time. We will notify you of material changes through an in-app notice or email. Continued use of the Service after an update constitutes acceptance of the revised terms.",
      ],
    },
    {
      title: "9. Contact",
      paragraphs: [
        "For questions or requests regarding these terms, please contact us through demo booking or via an in-app message for Pro and Agency customers.",
      ],
    },
  ],
};
