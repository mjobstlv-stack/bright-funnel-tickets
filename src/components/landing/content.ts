export type Lang = "en" | "he";

export interface LandingCopy {
  dir: "ltr" | "rtl";
  langCode: string;
  switchTo: { href: string; label: string };
  nav: { features: string; how: string; pricing: string; faq: string; login: string; cta: string };
  hero: {
    stamp: string;
    titleA: string;
    titleHighlight: string;
    sub: string;
    primaryCta: string;
    secondaryCta: string;
    trustline: string;
  };
  ticker: string[];
  oneLiner: {
    eyebrow: string;
    title: string;
    sub: string;
    stats: { value: string; label: string }[];
  };
  modules: {
    eyebrow: string;
    title: string;
    sub: string;
    tabs: string[];
    items: { icon: string; title: string; desc: string; tags: string[] }[];
  };
  how: {
    eyebrow: string;
    title: string;
    steps: { n: string; title: string; desc: string }[];
  };
  pricing: {
    eyebrow: string;
    title: string;
    sub: string;
    moduleLabels: { events: string; restaurant: string; bundle: string };
    plans: {
      name: string;
      desc: string;
      featured?: boolean;
      cta: string;
      events: { price: string; per: string; features: string[] };
      restaurant: { price: string; per: string; features: string[] };
      bundle?: { price: string; per: string; note: string };
    }[];
    note: string;
    ticketFeeNote: string;
    aiAddon: {
      eyebrow: string;
      title: string;
      sub: string;
      tiers: {
        name: string;
        price: string;
        per: string;
        quota: string;
        overage: string;
        featured?: boolean;
        features: string[];
      }[];
    };
  };
  faq: { eyebrow: string; title: string; items: { q: string; a: string }[] };
  finalCta: { title: string; sub: string; primary: string; secondary: string };
  footer: {
    tagline: string;
    cols: { title: string; links: string[] }[];
    rights: string;
    terms: string;
  };
  a11y: { open: string; fontSize: string; highContrast: string; reset: string; close: string };
}

export const copy: Record<Lang, LandingCopy> = {
  he: {
    dir: "rtl",
    langCode: "he",
    switchTo: { href: "/en", label: "English" },
    nav: {
      features: "מה יש בפנים",
      how: "איך זה עובד",
      pricing: "מחירים",
      faq: "שאלות",
      login: "התחברות",
      cta: "התחילו חינם",
    },
    hero: {
      stamp: "כל אירוע · כל מסעדה · מערכת אחת",
      titleA: "כל התפעול שלכם",
      titleHighlight: "במקום אחד",
      sub: "כרטוס, שמירת מקום, סידור עבודה, שעון נוכחות, מלאי וכספים — במערכת אחת עם AI.",
      primaryCta: "התחילו חינם",
      secondaryCta: "לצפייה במודולים",
      trustline: "ללא כרטיס אשראי · הקמה ב-10 דקות",
    },
    ticker: ["כרטוס", "שמירת מקום", "סידור עבודה", "מלאי", "כספים", "AI"],
    oneLiner: {
      eyebrow: "הבעיה",
      title: "פחות טאבים, פחות אקסלים, פחות כאב ראש.",
      sub: "הכל ניהול תפעול היה פזור בין כלים וקבוצות ווטסאפ. עכשיו יש מקום אחד שמכיל הכל.",
      stats: [
        { value: "8", label: "מודולים במערכת אחת" },
        { value: "4", label: "משתמשים בכל מרחב" },
        { value: "0.5%", label: "עמלה על מכירת כרטיס" },
      ],
    },
    modules: {
      eyebrow: "מה יש בפנים",
      title: "ארבעה מודולים שמרכזים את היום־יום",
      sub: "בחרו תפקיד — ותראו מה הכי רלוונטי לכם.",
      tabs: ["הכל", "מכירות", "תפעול", "כספים"],
      items: [
        {
          icon: "🎟️",
          title: "כרטוס ושמירת מקום",
          desc: "מכירת כרטיסים, לוח מארחת, תורי המתנה ופיקדון — 0.5% עמלה בלבד במסלולים בתשלום.",
          tags: ["הכל", "מכירות"],
        },
        {
          icon: "🗓️",
          title: "סידור עבודה ונוכחות",
          desc: "העובדים מגישים אילוצים, המערכת בונה סידור, ושעון הנוכחות מחשב עלות שכר.",
          tags: ["הכל", "תפעול"],
        },
        {
          icon: "📦",
          title: "מלאי וקופה",
          desc: "חיבור לקופה מוריד מלאי אוטומטית, ותפריטים מגיעים מ-PDF עם עזרת AI.",
          tags: ["הכל", "תפעול"],
        },
        {
          icon: "💰",
          title: "כספים חיים",
          desc: "הכנסות, הוצאות ועלות שכר מתעדכנים בזמן אמת — לראות רווח בכל רגע.",
          tags: ["הכל", "כספים"],
        },
      ],
    },
    how: {
      eyebrow: "איך זה עובד",
      title: "משיקים תפעול מלא באותו יום.",
      steps: [
        { n: "01", title: "מקימים את העסק", desc: "שם, לוגו, צבעים ושולחנות — כמה שדות וזהו." },
        {
          n: "02",
          title: "מחברים צוות וקופה",
          desc: "מזמינים משתמשים, מעלים תפריט ומחברים את הקופה.",
        },
        { n: "03", title: "פותחים את הדלתות", desc: "הזמנות נכנסות, הסידור נבנה והמלאי יורד לבד." },
      ],
    },
    pricing: {
      eyebrow: "מחירים",
      title: "מתחילים בקטן. משלמים כשגדלים.",
      sub: "מודול אירועים ומודול מסעדות — כל אחד בנפרד, או חבילה משולבת במחיר מוזל.",
      moduleLabels: { events: "🎟️ אירועים", restaurant: "🍽️ מסעדות", bundle: "אירועים + מסעדות" },
      plans: [
        {
          name: "Starter",
          desc: "לעסק קטן או אירוע ראשון. ניתן לבטל בכל עת.",
          cta: "התחילו ב-₪25",
          events: {
            price: "₪25",
            per: "לחודש לאירוע",
            features: ["ניתן לבטל בכל עת", "3% עמלת כרטיס", "עמוד הזמנה וסריקת QR"],
          },
          restaurant: {
            price: "₪50",
            per: "לחודש",
            features: ["ניתן לבטל בכל עת", "לוח מארחת בסיסי", "עמוד הזמנה ציבורי"],
          },
        },
        {
          name: "Pro",
          desc: "לעסק שרץ כל שבוע.",
          featured: true,
          cta: "התחילו 14 יום ניסיון",
          events: {
            price: "₪249",
            per: "לחודש",
            features: ["0.5% עמלת כרטיס", "סינון מבלים עם AI", "סידור עבודה ושעון נוכחות"],
          },
          restaurant: {
            price: "₪199",
            per: "לחודש",
            features: ["הזמנות ללא הגבלה", "פיקדון בכרטיס אשראי", "מפת שולחנות ואזורים"],
          },
          bundle: { price: "₪379", per: "לחודש", note: "חוסך ₪69 לחודש" },
        },
        {
          name: "Business",
          desc: "לרשתות, אולמות וסוכנויות.",
          cta: "דברו איתנו",
          events: {
            price: "₪599",
            per: "לחודש",
            features: ["0.5% עמלת כרטיס", "אירועים מרובים במקביל", "מלאי + קופה + כספים + API"],
          },
          restaurant: {
            price: "₪499",
            per: "לחודש",
            features: ["ריבוי סניפים", "מלאי + קופה", "דוח פערים יומי"],
          },
          bundle: { price: "₪899", per: "לחודש", note: "כולל מנהל לקוח ייעודי" },
        },
      ],
      note: "ללא דמי הקמה וללא חוזה שנתי — כל המסלולים חודשיים וניתנים לביטול בכל עת. כל התוכניות כוללות עמודי הזמנה ללא הגבלה וסריקת כרטיסים.",
      ticketFeeNote: "עמלת 0.5% נגבית על כל מכירת כרטיס בכל המסלולים בתשלום (ב-Starter: 3%).",
      aiAddon: {
        eyebrow: "תוספת AI",
        title: "חבילת AI חודשית — לפי מכסת פעולות.",
        sub: "פעולת AI = סינון פרופיל מבלה, קריאת תפריט או יצירת עמוד/טקסט שיווקי.",
        tiers: [
          {
            name: "AI Lite",
            price: "₪99",
            per: "לחודש",
            quota: "300 פעולות AI בחודש",
            overage: "₪0.5 לפעולה נוספת",
            features: [
              "סינון מבלים לפי קריטריונים",
              "קריאת תפריטים ומרכיבים",
              "טקסטים שיווקיים לאירוע",
            ],
          },
          {
            name: "AI Pro",
            price: "₪249",
            per: "לחודש",
            quota: "1,000 פעולות AI בחודש",
            overage: "₪0.35 לפעולה נוספת",
            featured: true,
            features: [
              "כולל ניתוח תמונות פרופיל",
              "מבחן קריטריונים לפני שימוש",
              "תור בדיקה אנושית מרוכז",
            ],
          },
          {
            name: "AI Unlimited",
            price: "₪599",
            per: "לחודש",
            quota: "ללא הגבלת פעולות (שימוש סביר)",
            overage: "בלי חיוב נוסף",
            features: [
              "מודלים מתקדמים לניתוח תמונות",
              "עדיפות בזמני תגובה",
              "התאמת קריטריונים אישית",
            ],
          },
        ],
      },
    },
    faq: {
      eyebrow: "שאלות",
      title: "מה שואלים לפני שנרשמים.",
      items: [
        {
          q: "צריך ידע טכני?",
          a: "לא. מקימים עסק בכמה שדות, והמערכת בונה את דף ההזמנה, התפריט והסידור הראשוני.",
        },
        {
          q: "אפשר לחבר את הקופה הקיימת?",
          a: "כן. API מאובטח שמוריד מלאי אוטומטית לפי מכירות ומייצר דוח פערים יומי.",
        },
        {
          q: "מה עם פרטיות ואבטחה?",
          a: "הרשאות לפי תפקיד, אימות דו־שלבי ולוג פעילות מלא לכל פעולה רגישה.",
        },
        {
          q: "איך מחושבת עמלת הכרטיסים ותוספת ה-AI?",
          a: "בכל מסלול בתשלום נגבית עמלה של 0.5% ממחיר הכרטיס שנמכר (ב-Starter 3%). ה-AI הוא תוספת חודשית נפרדת לפי מכסת פעולות — סינון מבלים, קריאת תפריטים ויצירת תוכן.",
        },
      ],
    },
    finalCta: {
      title: "המשמרת הבאה שלכם ראויה לחדר בקרה, לא ל-12 טאבים.",
      sub: "פותחים מרחב עבודה בכמה דקות. בלי כרטיס אשראי.",
      primary: "התחילו חינם",
      secondary: "לתיאום דמו",
    },
    footer: {
      tagline: "כל אירוע. כל מסעדה. מערכת אחת.",
      cols: [
        { title: "מוצר", links: ["כרטוס", "שמירת מקום", "סידור עבודה", "מלאי", "כספים"] },
        { title: "משאבים", links: ["מדריכים", "API", "סטטוס"] },
        { title: "משפטי", links: ["תנאים", "פרטיות", "אבטחה"] },
      ],
      rights: "© 2026 Event OS. כל הזכויות שמורות.",
      terms: "תנאי שימוש",
    },
    a11y: {
      open: "נגישות",
      fontSize: "גודל טקסט",
      highContrast: "ניגודיות גבוהה",
      reset: "איפוס",
      close: "סגור",
    },
  },

  en: {
    dir: "ltr",
    langCode: "en",
    switchTo: { href: "/", label: "עברית" },
    nav: {
      features: "What's inside",
      how: "How it works",
      pricing: "Pricing",
      faq: "FAQ",
      login: "Sign in",
      cta: "Start free",
    },
    hero: {
      stamp: "Every event · Every venue · One OS",
      titleA: "All your operations",
      titleHighlight: "in one place",
      sub: "Ticketing, reservations, staff scheduling, time clock, inventory and live P&L — one system with AI.",
      primaryCta: "Start free",
      secondaryCta: "See modules",
      trustline: "No credit card · Setup in 10 minutes",
    },
    ticker: ["Ticketing", "Reservations", "Scheduling", "Inventory", "Finance", "AI"],
    oneLiner: {
      eyebrow: "The problem",
      title: "Fewer tabs. Fewer spreadsheets. Fewer headaches.",
      sub: "Running operations used to be scattered across tools and WhatsApp groups. Now there is one place for everything.",
      stats: [
        { value: "8", label: "modules in one system" },
        { value: "4", label: "users per workspace" },
        { value: "0.5%", label: "fee per ticket sold" },
      ],
    },
    modules: {
      eyebrow: "What's inside",
      title: "Four modules that run your daily operations",
      sub: "Pick a role — see what's relevant to you.",
      tabs: ["All", "Sales", "Ops", "Money"],
      items: [
        {
          icon: "🎟️",
          title: "Tickets & reservations",
          desc: "Sell tickets, live host board, waitlist and deposits — just 0.5% on paid plans.",
          tags: ["All", "Sales"],
        },
        {
          icon: "🗓️",
          title: "Scheduling & time clock",
          desc: "Staff submit availability, the system builds the roster, and the clock tracks labor cost.",
          tags: ["All", "Ops"],
        },
        {
          icon: "📦",
          title: "Inventory & POS",
          desc: "Connect your POS to deduct stock automatically, and import menus from PDF with AI.",
          tags: ["All", "Ops"],
        },
        {
          icon: "💰",
          title: "Live finance",
          desc: "Revenue, expenses and labor cost update in real time — see profit at any moment.",
          tags: ["All", "Money"],
        },
      ],
    },
    how: {
      eyebrow: "How it works",
      title: "From signup to full operations — same day.",
      steps: [
        {
          n: "01",
          title: "Set up the business",
          desc: "Name, logo, colors and tables — a few fields and you are done.",
        },
        {
          n: "02",
          title: "Connect team & POS",
          desc: "Invite users, upload your menu and connect the POS.",
        },
        {
          n: "03",
          title: "Open the doors",
          desc: "Bookings come in, the roster builds itself and stock deducts automatically.",
        },
      ],
    },
    pricing: {
      eyebrow: "Pricing",
      title: "Start small. Pay as you grow.",
      sub: "An Events module and a Restaurants module — separately, or bundled at a lower price.",
      moduleLabels: {
        events: "🎟️ Events",
        restaurant: "🍽️ Restaurants",
        bundle: "Events + Restaurants",
      },
      plans: [
        {
          name: "Starter",
          desc: "For a small venue or a first event. Cancel anytime.",
          cta: "Start at ₪25",
          events: {
            price: "₪25",
            per: "per month, per event",
            features: ["Cancel anytime", "3% ticket fee", "Booking page + QR scanning"],
          },
          restaurant: {
            price: "₪50",
            per: "per month",
            features: ["Cancel anytime", "Basic host board", "Public booking page"],
          },
        },
        {
          name: "Pro",
          desc: "For a business running every week.",
          featured: true,
          cta: "Start 14-day trial",
          events: {
            price: "₪249",
            per: "per month",
            features: ["0.5% ticket fee", "AI guest screening", "Scheduling + time clock"],
          },
          restaurant: {
            price: "₪199",
            per: "per month",
            features: ["Unlimited bookings", "Card deposits", "Tables & areas map"],
          },
          bundle: { price: "₪379", per: "per month", note: "Save ₪69 per month" },
        },
        {
          name: "Business",
          desc: "For chains, venues and agencies.",
          cta: "Talk to us",
          events: {
            price: "₪599",
            per: "per month",
            features: [
              "0.5% ticket fee",
              "Multiple concurrent events",
              "Inventory + POS + finance + API",
            ],
          },
          restaurant: {
            price: "₪499",
            per: "per month",
            features: ["Multi-branch", "Inventory + POS", "Daily variance report"],
          },
          bundle: { price: "₪899", per: "per month", note: "Includes a dedicated manager" },
        },
      ],
      note: "No setup fees and no annual contracts — every plan is monthly and cancelable anytime. All plans include unlimited booking pages and QR ticket scanning.",
      ticketFeeNote: "A 0.5% fee applies to every ticket sold on all paid plans (Starter: 3%).",
      aiAddon: {
        eyebrow: "AI add-on",
        title: "A monthly AI package — priced by actions.",
        sub: "One AI action = screening a guest profile, parsing a menu, or generating a page / marketing copy.",
        tiers: [
          {
            name: "AI Lite",
            price: "₪99",
            per: "per month",
            quota: "300 AI actions / month",
            overage: "₪0.5 per extra action",
            features: [
              "Guest screening by your criteria",
              "Menu & ingredient parsing",
              "Event marketing copy",
            ],
          },
          {
            name: "AI Pro",
            price: "₪249",
            per: "per month",
            quota: "1,000 AI actions / month",
            overage: "₪0.35 per extra action",
            featured: true,
            features: [
              "Includes profile image analysis",
              "Criteria tester before you go live",
              "Central human review queue",
            ],
          },
          {
            name: "AI Unlimited",
            price: "₪599",
            per: "per month",
            quota: "Unlimited actions (fair use)",
            overage: "No extra charge",
            features: [
              "Advanced vision models",
              "Priority response times",
              "Custom criteria tuning",
            ],
          },
        ],
      },
    },
    faq: {
      eyebrow: "Questions",
      title: "What people ask before signing up.",
      items: [
        {
          q: "Do I need technical skills?",
          a: "No. Set up the business in a few fields, and the system builds your booking page, menu and first roster.",
        },
        {
          q: "Can I connect my existing POS?",
          a: "Yes. A secure API deducts stock automatically from every sale and produces a daily variance report.",
        },
        {
          q: "What about privacy and security?",
          a: "Role-based permissions, two-factor auth and a full activity log on every sensitive action.",
        },
        {
          q: "How are ticket fees and the AI add-on calculated?",
          a: "Every paid plan charges 0.5% of each ticket sold (Starter is 3%). AI is a separate monthly package priced by action quota — guest screening, menu parsing and content generation.",
        },
      ],
    },
    finalCta: {
      title: "Your next shift deserves a control room, not 12 tabs.",
      sub: "Spin up a workspace in minutes. No credit card.",
      primary: "Start free",
      secondary: "Book a demo",
    },
    footer: {
      tagline: "Every event. Every venue. One OS.",
      cols: [
        {
          title: "Product",
          links: ["Ticketing", "Reservations", "Scheduling", "Inventory", "Finance"],
        },
        { title: "Resources", links: ["Guides", "API", "Status"] },
        { title: "Legal", links: ["Terms", "Privacy", "Security"] },
      ],
      rights: "© 2026 Event OS. All rights reserved.",
      terms: "Terms of Service",
    },
    a11y: {
      open: "Accessibility",
      fontSize: "Font size",
      highContrast: "High contrast",
      reset: "Reset",
      close: "Close",
    },
  },
};
