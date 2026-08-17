import { Context, SessionFlavor } from 'grammy';

export interface SessionData {
  step:
    | 'IDLE'
    | 'LANGUAGE_SELECT'
    | 'CONSENT'
    | 'COMPANY_SELECT'
    | 'COMPANY_SEARCH'
    | 'RECOMMEND_QUIZ_CITY'
    | 'RECOMMEND_QUIZ_FIELD'
    | 'RECOMMEND_QUIZ_ROLE'
    | 'VACANCY_SELECT'
    | 'QUESTIONNAIRE'
    | 'VIDEO_UPLOAD'
    | 'PREVIEW'
    | 'EDIT_SECTION_SELECT';
  
  lang: string;
  applicationId?: string;
  selectedCompanyId?: string;
  selectedCompanyName?: string;
  selectedVacancyId?: string;
  selectedVacancyName?: string;
  referralCode?: string;
  source?: string;

  // Pagination & Search
  companyPage: number;
  searchQuery?: string;

  // Recommendation Quiz
  recommendAnswers?: {
    city?: string;
    field?: string;
    role?: string;
  };

  // Questionnaire state
  currentQuestionIndex: number;
  answers: Record<string, any>; // questionCode -> answer
  currentMultiSelectAnswers?: string[];

  // Video metadata
  videoFileId?: string;
  videoDuration?: number;

  // Temporary edit target
  editingSection?: string;
}

export type BotContext = Context & SessionFlavor<SessionData>;
