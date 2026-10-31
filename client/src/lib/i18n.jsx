// English and Persian text for the interface. Persian also switches the page to right-to-left.
import { createContext, useContext, useEffect, useState } from "react";
import ltrCss from "bootstrap/dist/css/bootstrap.min.css?url";
import rtlCss from "bootstrap/dist/css/bootstrap.rtl.min.css?url";

const en = {
  "nav.room": "Control room",
  "nav.agents": "Agents",
  "nav.skills": "Skills",
  "nav.history": "History",

  "mode.developer": "Developer",
  "mode.tester": "Tester",
  "mode.observer": "Observer",
  "mode.consultant": "Consultant",
  "mode.assistant": "Assistant",
  "kind.S": "Specialist",
  "kind.T": "Assistant",

  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.saving": "Saving…",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.close": "Close",
  "common.on": "On",
  "common.off": "Off",
  "common.default": "Default",

  "room.title": "Control room",
  "room.subtitle": "Turn agents on, pick each one's mode, then give a task or a topic.",
  "room.folder": "Project folder",
  "room.open": "Open",
  "room.new": "New conversation",
  "room.noAgents": "No agents yet. Create some on the Agents page.",
  "room.working": "Working",
  "room.idle": "Idle",
  "room.ask": "Ask only this one",
  "room.use": "Use",
  "room.noLog": "No activity in this conversation yet.",
  "room.empty": "Write a task or a topic below. What happens depends on the modes you picked.",

  "flow.nobody": "Nobody will act: turn on a specialist and pick its mode, or start with @ and an assistant's name.",
  "flow.develop": "{dev} plans the work, you approve it, then it builds.",
  "flow.observe": "{list} will comment along the way.",
  "flow.test": "{list} will test it.",
  "flow.testAfter": "After the build, {list} will test it.",
  "flow.consultOne": "{name} answers.",
  "flow.discuss": "{list} discuss it in {n} rounds, each reading the others.",
  "flow.observeUser": "{list} will review your own uncommitted changes.",
  "flow.assist": "{name} turns your input into output.",
  "flow.mention": "Only {name} answers.",

  "chat.placeholder": "Write a task or a topic…",
  "chat.revisePlaceholder": "What should change in the plan?",
  "chat.send": "Send",
  "chat.revise": "Revise",
  "chat.stop": "Stop",
  "chat.working": "Agents are working…",
  "chat.awaiting": "The plan is waiting for your approval",
  "chat.note": "Optional note for the developer",
  "chat.approve": "Approve and build",
  "chat.orRevise": "Or write below what to change, and the developer revises the plan.",
  "chat.plan": "Proposed plan",
  "chat.review": "Review",
  "chat.result": "Result",
  "chat.checkpoint": "Checkpoint {n}",
  "chat.final": "Final review",
  "chat.round": "Round {n}",
  "chat.steps": "{name}: {n} steps",
  "chat.step": "{name}: 1 step",
  "chat.deleted": "Deleted agent",
  "chat.approved": "Approved.",
  "chat.stopped": "Stopped.",
  "chat.back": "History",
  "chat.attach": "Attach files (images, documents, …)",
  "chat.uploading": "Uploading",
  "chat.removeFile": "Remove {name}",
  "chat.tooManyFiles": "You can attach up to {n} files to one message.",
  "chat.fileTooBig": "{name} is larger than 25 MB.",
  "chat.pick": "Choose",
  "chat.picked": "{n} chosen",
  "chat.pickHint": "Want one answer from these results?",
  "chat.pickAll": "Choose all results",
  "chat.pickClear": "Clear",
  "chat.converge": "Discuss and agree",
  "chat.convergeAsk": "Discuss these {n} results and give one shared conclusion.",
  "chat.joint": "Shared conclusion",

  "code.switch": "Choose the app mode",
  "code.subtitle": "Every code change waits here for your answer, with the file and the agent that proposed it.",
  "code.title": "Code changes",
  "code.empty": "No changes yet. When an agent wants to change code, it appears here.",
  "code.ask": "Do you want to make this change?",
  "code.reason": "Why not? (optional, the agent reads this)",
  "code.accept": "Yes, change it",
  "code.reject": "No",
  "code.answered": "{n} answered",
  "code.status.applied": "Applied",
  "code.status.rejected": "Rejected",
  "code.status.failed": "Failed",
  "code.status.cancelled": "Cancelled",

  "agents.title": "Agents",
  "agents.subtitle": "Specialists (S) work in four modes; assistants (T) turn input into output.",
  "agents.new": "New agent",
  "agents.all": "All",
  "agents.specialists": "Specialists",
  "agents.assistants": "Assistants",
  "agents.noExpertise": "No expertise written yet.",
  "agents.confirmDelete": "Delete {name}? Its messages in old conversations stay, without a name.",
  "agents.editTitle": "Edit {name}",
  "agents.name": "Name",
  "agents.type": "Type",
  "agents.typeS": "S · Specialist (4 modes)",
  "agents.typeT": "T · Assistant (input → output)",
  "agents.expertise": "Expertise",
  "agents.expertiseHint": "e.g. PostgreSQL schema design and query performance",
  "agents.instructions": "Instructions",
  "agents.instructionsHint": "How this agent should think and work. The mode instructions are added automatically.",
  "agents.mode": "Mode",
  "agents.model": "Model",
  "agents.opus": "Opus (strongest)",
  "agents.sonnet": "Sonnet (balanced)",
  "agents.haiku": "Haiku (fastest)",
  "agents.tools": "Tools",
  "agents.toolsNone": "None",
  "agents.toolsRead": "Read only",
  "agents.toolsWrite": "Read and write",
  "agents.helpNone": "No tools: works only on the text it is given",
  "agents.helpRead": "Can read files and search the web, cannot change anything",
  "agents.helpWrite": "Can edit files and run commands (needed for Developer mode)",
  "agents.skills": "Skills",
  "agents.noSkills": "No skills in the library yet. Add some on the Skills page.",
  "agents.enabled": "Turned on",
  "agents.toolsBadge": "tools: {tools}",

  "skills.title": "Skills",
  "skills.subtitle": "A library of skills. Assign them to agents on the Agents page.",
  "skills.add": "Add skill",
  "skills.empty": "No skills yet. Add one from GitHub or write your own.",
  "skills.colName": "Name",
  "skills.colDescription": "Description",
  "skills.colSource": "Source",
  "skills.manual": "manual",
  "skills.confirmDelete": "Delete the skill {name}? Agents that use it lose it.",
  "skills.fromGithub": "From GitHub",
  "skills.write": "Write it",
  "skills.preview": "Preview",
  "skills.loading": "Loading…",
  "skills.githubHint": "Link to a folder that has a SKILL.md at its root. You see everything before it is installed.",
  "skills.libraryName": "Name in the library",
  "skills.description": "Description",
  "skills.scriptsWarning": "This skill has {n} file(s) that are not Markdown: {files}. Agents may run them. Install only if you trust the source.",
  "skills.files": "{n} files",
  "skills.install": "Install skill",
  "skills.installing": "Installing…",
  "skills.nameHint": "Taken from SKILL.md if empty",
  "skills.saveSkill": "Save skill",
  "skills.source": "Source",
  "skills.editMd": "Edit SKILL.md",

  "history.title": "History",
  "history.subtitle": "Every conversation, newest first.",
  "history.empty": "No conversations yet.",
  "history.confirmDelete": "Delete the conversation \"{title}\" and its messages?",
  "history.type.room": "Control room",
  "history.type.develop": "Develop",
  "history.type.test": "Test",
  "history.type.observe": "Observe",
  "history.type.consult": "Consult",
  "history.type.assist": "Assist",
  "status.idle": "Idle",
  "status.running": "Working",
  "status.awaiting_approval": "Waiting for your approval",
};

const fa = {
  "nav.room": "اتاق کنترل",
  "nav.agents": "ایجنت‌ها",
  "nav.skills": "اسکیل‌ها",
  "nav.history": "تاریخچه",

  "mode.developer": "توسعه‌دهنده",
  "mode.tester": "تستر",
  "mode.observer": "ناظر",
  "mode.consultant": "مشاور",
  "mode.assistant": "دستیار",
  "kind.S": "متخصص",
  "kind.T": "دستیار",

  "common.cancel": "انصراف",
  "common.save": "ذخیره",
  "common.saving": "در حال ذخیره…",
  "common.edit": "ویرایش",
  "common.delete": "حذف",
  "common.close": "بستن",
  "common.on": "روشن",
  "common.off": "خاموش",
  "common.default": "پیش‌فرض",

  "room.title": "اتاق کنترل",
  "room.subtitle": "ایجنت‌ها را روشن کن، حالت هر کدام را انتخاب کن، بعد کار یا موضوع را بنویس.",
  "room.folder": "پوشه‌ی پروژه",
  "room.open": "باز کن",
  "room.new": "گفتگوی جدید",
  "room.noAgents": "هنوز ایجنتی نداری. از صفحه‌ی ایجنت‌ها بساز.",
  "room.working": "در حال کار",
  "room.idle": "بیکار",
  "room.ask": "فقط از این بپرس",
  "room.use": "استفاده",
  "room.noLog": "هنوز در این گفتگو کاری نکرده.",
  "room.empty": "کار یا موضوع را پایین بنویس. اینکه چه اتفاقی می‌افتد به حالت‌هایی که انتخاب کرده‌ای بستگی دارد.",

  "flow.nobody": "کسی کاری نمی‌کند: یک متخصص را روشن کن و حالتش را انتخاب کن، یا با @ و اسم یک دستیار شروع کن.",
  "flow.develop": "{dev} کار را برنامه‌ریزی می‌کند، تو تأیید می‌کنی، بعد می‌سازد.",
  "flow.observe": "{list} وسط کار نظر می‌دهند.",
  "flow.test": "{list} آن را تست می‌کنند.",
  "flow.testAfter": "بعد از ساخت، {list} تستش می‌کنند.",
  "flow.consultOne": "{name} جواب می‌دهد.",
  "flow.discuss": "{list} در {n} دور با هم بحث می‌کنند و هر کدام نظر بقیه را می‌خواند.",
  "flow.observeUser": "{list} تغییرات ذخیره‌نشده‌ی خودت را بررسی می‌کنند.",
  "flow.assist": "{name} ورودی را می‌گیرد و خروجی می‌دهد.",
  "flow.mention": "فقط {name} جواب می‌دهد.",

  "chat.placeholder": "کار یا موضوع را بنویس…",
  "chat.revisePlaceholder": "چه چیزی در نقشه عوض شود؟",
  "chat.send": "ارسال",
  "chat.revise": "اصلاح",
  "chat.stop": "توقف",
  "chat.working": "ایجنت‌ها در حال کارند…",
  "chat.awaiting": "نقشه منتظر تأیید توست",
  "chat.note": "یادداشت اختیاری برای توسعه‌دهنده",
  "chat.approve": "تأیید و ساخت",
  "chat.orRevise": "یا پایین بنویس چه چیزی عوض شود تا توسعه‌دهنده نقشه را اصلاح کند.",
  "chat.plan": "نقشه‌ی پیشنهادی",
  "chat.review": "نظر",
  "chat.result": "نتیجه",
  "chat.checkpoint": "ایستگاه {n}",
  "chat.final": "بررسی نهایی",
  "chat.round": "دور {n}",
  "chat.steps": "{name}: {n} قدم",
  "chat.step": "{name}: ۱ قدم",
  "chat.deleted": "ایجنت حذف‌شده",
  "chat.approved": "تأیید شد.",
  "chat.stopped": "متوقف شد.",
  "chat.back": "تاریخچه",
  "chat.attach": "پیوست فایل (عکس، سند، …)",
  "chat.uploading": "در حال آپلود",
  "chat.removeFile": "حذف {name}",
  "chat.tooManyFiles": "به هر پیام حداکثر {n} فایل می‌شود پیوست کرد.",
  "chat.fileTooBig": "حجم {name} بیشتر از ۲۵ مگابایت است.",
  "chat.pick": "انتخاب",
  "chat.picked": "{n} نتیجه انتخاب شد",
  "chat.pickHint": "از این نتایج یک جواب مشترک می‌خواهی؟",
  "chat.pickAll": "انتخاب همه‌ی نتایج",
  "chat.pickClear": "پاک کردن",
  "chat.converge": "بحث و نتیجه‌ی مشترک",
  "chat.convergeAsk": "درباره‌ی این {n} نتیجه بحث کنید و یک نتیجه‌ی مشترک بدهید.",
  "chat.joint": "نتیجه‌ی مشترک",

  "code.switch": "انتخاب حالت اپ",
  "code.subtitle": "هر تغییر کد اینجا منتظر جواب توست، با اسم فایل و ایجنتی که پیشنهادش داده.",
  "code.title": "تغییرات کد",
  "code.empty": "هنوز تغییری نیست. وقتی ایجنتی بخواهد کدی را عوض کند، اینجا نشان داده می‌شود.",
  "code.ask": "این تغییر انجام شود؟",
  "code.reason": "چرا نه؟ (اختیاری، ایجنت این را می‌خواند)",
  "code.accept": "بله، تغییر بده",
  "code.reject": "نه",
  "code.answered": "{n} مورد پاسخ داده شده",
  "code.status.applied": "اعمال شد",
  "code.status.rejected": "رد شد",
  "code.status.failed": "ناموفق",
  "code.status.cancelled": "لغو شد",

  "agents.title": "ایجنت‌ها",
  "agents.subtitle": "متخصص‌ها (S) چهار حالت دارند؛ دستیارها (T) ورودی را می‌گیرند و خروجی می‌دهند.",
  "agents.new": "ایجنت جدید",
  "agents.all": "همه",
  "agents.specialists": "متخصص‌ها",
  "agents.assistants": "دستیارها",
  "agents.noExpertise": "هنوز تخصصی نوشته نشده.",
  "agents.confirmDelete": "{name} حذف شود؟ پیام‌هایش در گفتگوهای قبلی بدون اسم می‌مانند.",
  "agents.editTitle": "ویرایش {name}",
  "agents.name": "اسم",
  "agents.type": "نوع",
  "agents.typeS": "S · متخصص (۴ حالت)",
  "agents.typeT": "T · دستیار (ورودی ← خروجی)",
  "agents.expertise": "تخصص",
  "agents.expertiseHint": "مثلاً طراحی دیتابیس PostgreSQL و بهینه‌سازی کوئری",
  "agents.instructions": "دستورالعمل",
  "agents.instructionsHint": "این ایجنت چطور فکر و کار کند. دستورالعمل حالت‌ها خودکار اضافه می‌شود.",
  "agents.mode": "حالت",
  "agents.model": "مدل",
  "agents.opus": "Opus (قوی‌ترین)",
  "agents.sonnet": "Sonnet (متعادل)",
  "agents.haiku": "Haiku (سریع‌ترین)",
  "agents.tools": "ابزارها",
  "agents.toolsNone": "هیچ",
  "agents.toolsRead": "فقط خواندن",
  "agents.toolsWrite": "خواندن و نوشتن",
  "agents.helpNone": "بدون ابزار: فقط روی متنی که به آن داده می‌شود کار می‌کند",
  "agents.helpRead": "فایل می‌خواند و در وب جستجو می‌کند، ولی چیزی را تغییر نمی‌دهد",
  "agents.helpWrite": "فایل‌ها را ویرایش می‌کند و دستور اجرا می‌کند (برای حالت توسعه‌دهنده لازم است)",
  "agents.skills": "اسکیل‌ها",
  "agents.noSkills": "هنوز اسکیلی در کتابخانه نیست. از صفحه‌ی اسکیل‌ها اضافه کن.",
  "agents.enabled": "روشن",
  "agents.toolsBadge": "ابزار: {tools}",

  "skills.title": "اسکیل‌ها",
  "skills.subtitle": "کتابخانه‌ی اسکیل‌ها. از صفحه‌ی ایجنت‌ها به هر ایجنت بده.",
  "skills.add": "افزودن اسکیل",
  "skills.empty": "هنوز اسکیلی نیست. از GitHub اضافه کن یا خودت بنویس.",
  "skills.colName": "اسم",
  "skills.colDescription": "توضیح",
  "skills.colSource": "منبع",
  "skills.manual": "دستی",
  "skills.confirmDelete": "اسکیل {name} حذف شود؟ ایجنت‌هایی که دارندش آن را از دست می‌دهند.",
  "skills.fromGithub": "از GitHub",
  "skills.write": "خودم می‌نویسم",
  "skills.preview": "پیش‌نمایش",
  "skills.loading": "در حال بارگذاری…",
  "skills.githubHint": "لینک پوشه‌ای را بده که در ریشه‌اش SKILL.md دارد. قبل از نصب همه‌چیز را می‌بینی.",
  "skills.libraryName": "اسم در کتابخانه",
  "skills.description": "توضیح",
  "skills.scriptsWarning": "این اسکیل {n} فایل غیر از Markdown دارد: {files}. ایجنت‌ها ممکن است اجرایشان کنند. فقط اگر به منبع اعتماد داری نصب کن.",
  "skills.files": "{n} فایل",
  "skills.install": "نصب اسکیل",
  "skills.installing": "در حال نصب…",
  "skills.nameHint": "اگر خالی باشد از SKILL.md برداشته می‌شود",
  "skills.saveSkill": "ذخیره‌ی اسکیل",
  "skills.source": "منبع",
  "skills.editMd": "ویرایش SKILL.md",

  "history.title": "تاریخچه",
  "history.subtitle": "همه‌ی گفتگوها، جدیدترین اول.",
  "history.empty": "هنوز گفتگویی نیست.",
  "history.confirmDelete": "گفتگوی «{title}» و پیام‌هایش حذف شود؟",
  "history.type.room": "اتاق کنترل",
  "history.type.develop": "توسعه",
  "history.type.test": "تست",
  "history.type.observe": "نظارت",
  "history.type.consult": "مشاوره",
  "history.type.assist": "دستیار",
  "status.idle": "بیکار",
  "status.running": "در حال کار",
  "status.awaiting_approval": "منتظر تأیید تو",
};

const dictionaries = { en, fa };
const STORAGE_KEY = "agent-studio-lang";

function savedLang() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "fa" ? "fa" : "en";
  } catch {
    return "en";
  }
}

// Called once before the first render so the page never flashes in the wrong direction.
export function applyLang(lang) {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === "fa" ? "rtl" : "ltr";
  let link = document.getElementById("bootstrap-css");
  if (!link) {
    link = document.createElement("link");
    link.id = "bootstrap-css";
    link.rel = "stylesheet";
    document.head.prepend(link);
  }
  link.href = lang === "fa" ? rtlCss : ltrCss;
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(savedLang);

  useEffect(() => {
    applyLang(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Private windows may block storage; the choice then lasts until reload.
    }
  }, [lang]);

  const t = (key, vars = {}) => {
    const text = dictionaries[lang][key] ?? en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, v) => (vars[v] ?? `{${v}}`));
  };
  // Lists like "A, B and C" in the current language.
  const list = (names) => new Intl.ListFormat(lang === "fa" ? "fa" : "en", { type: "conjunction" }).format(names);

  return <I18nContext.Provider value={{ lang, setLang, t, list }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export { savedLang };
