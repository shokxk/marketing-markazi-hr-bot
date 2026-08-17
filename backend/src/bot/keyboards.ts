import { Keyboard, InlineKeyboard } from 'grammy';
import { t } from '../locales/i18n';

export function getMainMenuKeyboard(lang = 'uz') {
  const baseUrl = process.env.RENDER_EXTERNAL_URL || 'https://marketing-markazi-hr-bot.onrender.com';
  const webAppUrl = `${baseUrl}/app?v=20260804_v11`;
  return new Keyboard()
    .webApp('📱 Mini App (Vakansiyalar & HR UI)', webAppUrl)
    .row()
    .text(t('btn_start_anketa', lang))
    .text(t('btn_vacancies', lang))
    .row()
    .text(t('btn_help', lang))
    .resized();
}

export function getConsentKeyboard(lang = 'uz') {
  return new InlineKeyboard()
    .text(t('btn_consent_yes', lang), 'consent_yes')
    .text(t('btn_consent_no', lang), 'consent_no');
}

export function getCompanyListKeyboard(
  companies: { id: string; name: string }[],
  page: number,
  totalPages: number,
  lang = 'uz'
) {
  const kb = new InlineKeyboard();

  // Show up to 6-8 companies per page
  companies.forEach((c) => {
    kb.text(c.name, `select_company:${c.id}`).row();
  });

  // Pagination row
  const navRow = [];
  if (page > 1) {
    navRow.push({ text: t('btn_prev_page', lang), callback_data: `company_page:${page - 1}` });
  }
  if (page < totalPages) {
    navRow.push({ text: t('btn_next_page', lang), callback_data: `company_page:${page + 1}` });
  }

  if (navRow.length > 0) {
    navRow.forEach((btn) => kb.text(btn.text, btn.callback_data));
    kb.row();
  }

  kb.text(t('btn_search_company', lang), 'company_search').row();
  kb.text(t('btn_recommend_me', lang), 'company_recommend').row();

  return kb;
}

export function getVacancyListKeyboard(vacancies: { id: string; title: string }[], lang = 'uz') {
  const kb = new InlineKeyboard();

  vacancies.forEach((v) => {
    kb.text(v.title, `select_vacancy:${v.id}`).row();
  });

  kb.text(t('btn_back', lang), 'back_to_companies');
  return kb;
}

export function getQuestionControlKeyboard(options?: string[], showBack = true, lang = 'uz') {
  const kb = new InlineKeyboard();

  if (options && options.length > 0) {
    options.forEach((opt) => {
      kb.text(opt, `answer_opt:${opt}`).row();
    });
  }

  if (showBack) {
    kb.text(t('btn_back', lang), 'question_back');
  }
  kb.text(t('btn_cancel', lang), 'question_cancel');

  return kb;
}

export function getPhoneRequestKeyboard(lang = 'uz') {
  return new Keyboard()
    .requestContact(t('btn_send_phone', lang))
    .row()
    .text(t('btn_cancel', lang))
    .resized();
}

export function getExtraPhoneRequestKeyboard(lang = 'uz') {
  return new Keyboard()
    .requestContact(t('btn_send_phone', lang))
    .row()
    .text('⏩ O\'tkazib yuborish')
    .row()
    .text(t('btn_back', lang))
    .text(t('btn_cancel', lang))
    .resized();
}

export function getExtraPhoneInlineKeyboard(lang = 'uz') {
  return new InlineKeyboard()
    .text('⏩ O\'tkazib yuborish', 'skip_extra_phone')
    .row()
    .text(t('btn_back', lang), 'question_back')
    .text(t('btn_cancel', lang), 'question_cancel');
}

export function getMultiSelectKeyboard(
  options: string[],
  selected: string[] = [],
  showBack = true,
  lang = 'uz'
) {
  const kb = new InlineKeyboard();

  options.forEach((opt, idx) => {
    const isChecked = selected.includes(opt);
    const icon = isChecked ? '✅' : '◻️';
    kb.text(`${icon} ${opt}`, `toggle_multi:${idx}`).row();
  });

  const confirmText = selected.length > 0
    ? `🔘 ✅ Tayyor (${selected.length} ta tanlandi)`
    : '🔘 ✅ Tayyor (Keyingisi)';
  
  kb.text(confirmText, 'confirm_multi').row();

  const navRow = [];
  if (showBack) {
    navRow.push({ text: t('btn_back', lang), callback_data: 'question_back' });
  }
  navRow.push({ text: t('btn_cancel', lang), callback_data: 'question_cancel' });

  navRow.forEach((btn) => kb.text(btn.text, btn.callback_data));

  return kb;
}

export function getVideoPromptKeyboard(lang = 'uz') {
  return new InlineKeyboard()
    .text(t('btn_video_sample', lang), 'video_sample')
    .row()
    .text(t('btn_skip_video', lang), 'skip_video')
    .row()
    .text(t('btn_cancel', lang), 'question_cancel');
}

export function getPreviewKeyboard(lang = 'uz') {
  return new InlineKeyboard()
    .text('✅ Roziman, arizani yuborish 🚀', 'app_submit')
    .row()
    .text('✏️ Ma\'lumotlarni tahrirlash', 'app_edit')
    .row()
    .text('❌ Bekor qilish', 'app_cancel');
}

export function getEditSectionsKeyboard(lang = 'uz') {
  return new InlineKeyboard()
    .text(t('btn_edit_personal', lang), 'edit_sec_personal')
    .row()
    .text(t('btn_edit_experience', lang), 'edit_sec_experience')
    .row()
    .text(t('btn_edit_conditions', lang), 'edit_sec_conditions')
    .row()
    .text(t('btn_edit_video', lang), 'edit_sec_video')
    .row()
    .text(t('btn_back', lang), 'edit_sec_back');
}

export function getDraftFoundKeyboard(lang = 'uz') {
  return new InlineKeyboard()
    .text(t('btn_continue_draft', lang), 'draft_continue')
    .row()
    .text(t('btn_restart_draft', lang), 'draft_restart')
    .row()
    .text(t('btn_delete_draft', lang), 'draft_delete');
}
