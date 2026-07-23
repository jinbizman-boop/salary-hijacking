import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const distDir = path.join(rootDir, "apps", "mobile", "dist");
const screenshotDir = path.join(rootDir, "release", "screenshots");
const mobileUiEvidenceDir = path.join(
  rootDir,
  "release",
  "evidence",
  "mobile-ui",
);
const officialLogoPath = path.join(
  rootDir,
  "apps",
  "mobile",
  "src",
  "shared",
  "assets",
  "images",
  "brand",
  "salary-hijacking-platform-logo.png",
);
const webPort = 4175;
const apiPort = 8787;
const phoneViewport = "506,1096";
const phoneScale = "0.85";
const storePhoneScale = "2";
const captureOnlyFilter = process.env.CAPTURE_ONLY?.trim() ?? "";

function filterCaptures(captures) {
  const rawFilter = captureOnlyFilter;
  if (!rawFilter) return captures;

  const requested = new Set(
    rawFilter
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return captures.filter(([route, fileName]) => {
    const slug = String(route)
      .replace(/^\/capture\//u, "")
      .split("?")[0];
    return (
      requested.has(slug) ||
      requested.has(String(route)) ||
      requested.has(String(fileName)) ||
      requested.has(String(fileName).replace(/\.png$/u, ""))
    );
  });
}

const storeCaptures = [
  ["/capture/salary", "01_home_salary.png", phoneViewport, storePhoneScale],
  [
    "/capture/salary?focus=daily-budget",
    "02_daily_budget.png",
    phoneViewport,
    storePhoneScale,
  ],
  ["/capture/plan", "03_plan_setting.png", phoneViewport, storePhoneScale],
  [
    "/capture/notifications",
    "04_notifications.png",
    phoneViewport,
    storePhoneScale,
  ],
  ["/capture/level", "05_level_up.png", phoneViewport, storePhoneScale],
  ["/__feature-graphic", "feature_graphic_google_play.png", "1024,500", "1"],
];

const mobileUiEvidenceCaptures = [
  ["/capture/splash", "01_splash.png"],
  ["/capture/login", "02_login.png"],
  ["/capture/signup", "03_signup.png"],
  ["/onboarding", "04_onboarding.png"],
  ["/capture/salary", "05_salary_home.png"],
  ["/capture/salary?focus=daily-budget", "06_daily_budget.png"],
  ["/capture/plan", "07_plan_setting.png"],
  ["/capture/notifications", "08_notifications.png"],
  ["/capture/level", "09_level_hub.png"],
  ["/capture/reading", "10_level_reading.png"],
  ["/capture/news", "11_level_news.png"],
  ["/capture/english", "12_level_english.png"],
  ["/capture/health", "13_level_health.png"],
  ["/capture/community", "14_community.png"],
  ["/capture/community-write", "15_community_write.png"],
  ["/capture/profile", "16_profile.png"],
  ["/capture/profile-level", "17_profile_level.png"],
  ["/capture/profile-settings", "18_profile_settings.png"],
  ["/capture/profile-account", "19_profile_account.png"],
  ["/capture/profile-community", "20_profile_community.png"],
  ["/capture/profile-support", "21_profile_support.png"],
  ["/capture/profile-notices", "22_profile_notices.png"],
  ["/capture/community-post-detail", "23_community_post_detail.png"],
  ["/capture/notification-settings", "24_notification_settings.png"],
  ["/capture/common-loading", "25_common_loading.png"],
  ["/capture/common-empty", "26_common_empty.png"],
  ["/capture/common-error", "27_common_error.png"],
  ["/capture/common-offline", "28_common_offline.png"],
  ["/capture/terms-consent", "29_terms_consent.png"],
  ["/capture/expense-form-state", "30_expense_form_state.png"],
  ["/capture/fixed-expense-form", "31_fixed_expense_form.png"],
  ["/capture/fixed-saving-form", "32_fixed_saving_form.png"],
  ["/capture/living-cost-form", "33_living_cost_form.png"],
  ["/capture/modal-confirm", "34_modal_confirm.png"],
  ["/capture/modal-level-result", "35_modal_level_result.png"],
  ["/capture/bottom-sheet-category", "36_bottom_sheet_category.png"],
  ["/capture/notifications-empty", "37_notifications_empty.png"],
  ["/capture/notifications-offline", "38_notifications_offline.png"],
  ["/capture/notifications-error", "39_notifications_error.png"],
  ["/capture/notifications-all-read", "40_notifications_all_read.png"],
  [
    "/capture/notifications-no-unread-list",
    "41_notifications_no_unread_list.png",
  ],
  ["/capture/salary-no-plan", "42_salary_no_plan.png"],
  ["/capture/salary-compact", "43_salary_compact.png"],
  ["/capture/salary-detailed", "44_salary_detailed.png"],
  ["/capture/salary-offline", "45_salary_offline.png"],
  ["/capture/login-credential-error", "46_login_credential_error.png"],
  ["/capture/login-password-recovery", "47_login_password_recovery.png"],
  ["/capture/login-logout-complete", "48_login_logout_complete.png"],
  ["/capture/expense-form-edit", "49_expense_form_edit.png"],
  ["/capture/expense-form-refund", "50_expense_form_refund.png"],
  ["/capture/expense-form-validation", "51_expense_form_validation.png"],
  ["/capture/expense-delete-blocked", "52_expense_delete_blocked.png"],
  ["/capture/expense-invalidate-reason", "53_expense_invalidate_reason.png"],
  ["/capture/community-post-offline", "54_community_post_offline.png"],
  [
    "/capture/community-post-comment-restricted",
    "55_community_post_comment_restricted.png",
  ],
  ["/capture/community-post-own-menu", "56_community_post_own_menu.png"],
  ["/capture/community-post-blocked", "57_community_post_blocked.png"],
  ["/capture/community-post-hidden", "58_community_post_hidden.png"],
  ["/capture/community-post-load-error", "59_community_post_load_error.png"],
  [
    "/capture/community-post-sensitive-warning",
    "60_community_post_sensitive_warning.png",
  ],
  [
    "/capture/community-post-review-pending",
    "61_community_post_review_pending.png",
  ],
  ["/capture/community-post-hobby", "62_community_post_hobby.png"],
  ["/capture/community-post-deleted", "63_community_post_deleted.png"],
  ["/capture/community-post-restricted", "64_community_post_restricted.png"],
  [
    "/capture/community-write-attachments",
    "65_community_write_attachments.png",
  ],
  [
    "/capture/community-write-sensitive-warning",
    "66_community_write_sensitive_warning.png",
  ],
  ["/capture/community-write-restricted", "67_community_write_restricted.png"],
  ["/capture/community-write-draft", "68_community_write_draft.png"],
  [
    "/capture/community-write-draft-recovery",
    "69_community_write_draft_recovery.png",
  ],
  [
    "/capture/community-write-from-levelup",
    "70_community_write_from_levelup.png",
  ],
  ["/capture/community-write-validation", "71_community_write_validation.png"],
  [
    "/capture/community-write-question-anonymous",
    "72_community_write_question_anonymous.png",
  ],
  [
    "/capture/community-comments-load-error",
    "73_community_comments_load_error.png",
  ],
  [
    "/capture/community-comment-delete-confirm",
    "74_community_comment_delete_confirm.png",
  ],
  ["/capture/community-comment-edit", "75_community_comment_edit.png"],
  ["/capture/community-reply-compose", "76_community_reply_compose.png"],
  ["/capture/community-replies-expanded", "77_community_replies_expanded.png"],
  [
    "/capture/community-block-user-confirm",
    "78_community_block_user_confirm.png",
  ],
  ["/capture/community-comment-list", "79_community_comment_list.png"],
  [
    "/capture/community-comments-loading-more",
    "80_community_comments_loading_more.png",
  ],
  [
    "/capture/community-comment-submitting",
    "81_community_comment_submitting.png",
  ],
  ["/capture/community-comment-thread", "82_community_comment_thread.png"],
  [
    "/capture/community-comment-thread-alt",
    "83_community_comment_thread_alt.png",
  ],
  ["/capture/community-no-comments", "84_community_no_comments.png"],
  [
    "/capture/community-comment-thread-policy",
    "85_community_comment_thread_policy.png",
  ],
  ["/capture/profile-account-restricted", "86_profile_account_restricted.png"],
  ["/capture/profile-data-export-ready", "87_profile_data_export_ready.png"],
  [
    "/capture/profile-withdrawal-requested",
    "88_profile_withdrawal_requested.png",
  ],
  ["/capture/profile-biometric-app-lock", "89_profile_biometric_app_lock.png"],
  ["/capture/profile-withdrawal-reason", "90_profile_withdrawal_reason.png"],
  ["/capture/profile-rejoin-blocked", "91_profile_rejoin_blocked.png"],
  [
    "/capture/profile-data-export-processing",
    "92_profile_data_export_processing.png",
  ],
  [
    "/capture/profile-withdrawal-precheck",
    "93_profile_withdrawal_precheck.png",
  ],
  [
    "/capture/profile-privacy-usage-history",
    "94_profile_privacy_usage_history.png",
  ],
  [
    "/capture/profile-data-export-request",
    "95_profile_data_export_request.png",
  ],
  ["/capture/profile-password-change", "96_profile_password_change.png"],
  [
    "/capture/profile-account-settings-default",
    "97_profile_account_settings_default.png",
  ],
  ["/capture/plan-current-summary", "98_plan_current_summary.png"],
  ["/capture/plan-budget-summary-alt", "99_plan_budget_summary_alt.png"],
  ["/capture/plan-salary-info-edit", "100_plan_salary_info_edit.png"],
  ["/capture/plan-previous-picker", "101_plan_previous_picker.png"],
  ["/capture/plan-empty", "102_plan_empty.png"],
  ["/capture/plan-budget-detail-summary", "103_plan_budget_detail_summary.png"],
  ["/capture/plan-validation-warning", "104_plan_validation_warning.png"],
  [
    "/capture/profile-posts-loading-skeleton",
    "105_profile_posts_loading_skeleton.png",
  ],
  ["/capture/profile-posts-offline", "106_profile_posts_offline.png"],
  ["/capture/profile-posts-offline-alt", "107_profile_posts_offline_alt.png"],
  ["/capture/profile-liked-posts", "108_profile_liked_posts.png"],
  ["/capture/profile-drafts", "109_profile_drafts.png"],
  [
    "/capture/profile-share-certification-prompt",
    "110_profile_share_certification_prompt.png",
  ],
  [
    "/capture/profile-community-restricted",
    "111_profile_community_restricted.png",
  ],
  [
    "/capture/profile-shared-certification-detail",
    "112_profile_shared_certification_detail.png",
  ],
  ["/capture/profile-post-search-empty", "113_profile_post_search_empty.png"],
  [
    "/capture/profile-post-management-default",
    "114_profile_post_management_default.png",
  ],
  [
    "/capture/profile-written-posts-empty",
    "115_profile_written_posts_empty.png",
  ],
  ["/capture/level-mission-status-board", "116_level_mission_status_board.png"],
  ["/capture/level-record-pending", "117_level_record_pending.png"],
  [
    "/capture/level-mission-start-confirm",
    "118_level_mission_start_confirm.png",
  ],
  ["/capture/level-quick-mission-detail", "119_level_quick_mission_detail.png"],
  ["/capture/level-load-error", "120_level_load_error.png"],
  ["/capture/level-no-content", "121_level_no_content.png"],
  ["/capture/level-all-daily-complete", "122_level_all_daily_complete.png"],
  ["/capture/level-main-default", "123_level_main_default.png"],
  ["/capture/level-mission-progress", "124_level_mission_progress.png"],
  ["/capture/level-recommendations", "125_level_recommendations.png"],
  ["/capture/health-safety-check", "126_health_safety_check.png"],
  ["/capture/health-offline-cached", "127_health_offline_cached.png"],
  ["/capture/health-workout-detail", "128_health_workout_detail.png"],
  ["/capture/health-safety-unavailable", "129_health_safety_unavailable.png"],
  ["/capture/health-content-load-error", "130_health_content_load_error.png"],
  ["/capture/health-workout-in-progress", "131_health_workout_in_progress.png"],
  ["/capture/health-workout-flow", "132_health_workout_flow.png"],
  ["/capture/health-workout-record", "133_health_workout_record.png"],
  ["/capture/health-flow", "134_health_flow.png"],
  [
    "/capture/onboarding-salary-amount-keypad",
    "135_onboarding_salary_amount_keypad.png",
  ],
  [
    "/capture/onboarding-expected-salary-step",
    "136_onboarding_expected_salary_step.png",
  ],
  ["/capture/onboarding-intro-alt", "137_onboarding_intro_alt.png"],
  [
    "/capture/onboarding-daily-budget-step",
    "138_onboarding_daily_budget_step.png",
  ],
  ["/capture/onboarding-plan-review", "139_onboarding_plan_review.png"],
  ["/capture/onboarding-payday-step", "140_onboarding_payday_step.png"],
  ["/capture/onboarding-complete", "141_onboarding_complete.png"],
  [
    "/capture/onboarding-fixed-expense-step",
    "142_onboarding_fixed_expense_step.png",
  ],
  [
    "/capture/onboarding-fixed-savings-step",
    "143_onboarding_fixed_savings_step.png",
  ],
  ["/capture/community-state-board-ko", "144_community_state_board_ko.png"],
  [
    "/capture/community-state-board-en-tabs",
    "145_community_state_board_en_tabs.png",
  ],
  [
    "/capture/community-offline-moderation-board",
    "146_community_offline_moderation_board.png",
  ],
  ["/capture/community-state-board", "147_community_state_board.png"],
  ["/capture/community-hobby-board", "148_community_hobby_board.png"],
  ["/capture/community-levelup-board", "149_community_levelup_board.png"],
  ["/capture/community-search-results", "150_community_search_results.png"],
  ["/capture/community-free-board-alt", "151_community_free_board_alt.png"],
  ["/capture/fixed-saving-add-goal", "152_fixed_saving_add_goal.png"],
  [
    "/capture/fixed-saving-add-savings-goal",
    "153_fixed_saving_add_savings_goal.png",
  ],
  [
    "/capture/fixed-saving-add-investment",
    "154_fixed_saving_add_investment.png",
  ],
  ["/capture/fixed-saving-saving", "155_fixed_saving_saving.png"],
  ["/capture/fixed-saving-save-failure", "156_fixed_saving_save_failure.png"],
  ["/capture/fixed-saving-edit-savings", "157_fixed_saving_edit_savings.png"],
  ["/capture/fixed-saving-edit-inactive", "158_fixed_saving_edit_inactive.png"],
  [
    "/capture/fixed-saving-delete-confirm",
    "159_fixed_saving_delete_confirm.png",
  ],
  [
    "/capture/profile-performance-partial-error",
    "160_profile_performance_partial_error.png",
  ],
  [
    "/capture/profile-offline-performance-preview",
    "161_profile_offline_performance_preview.png",
  ],
  ["/capture/profile-page-load-error", "162_profile_page_load_error.png"],
  [
    "/capture/profile-page-account-restricted",
    "163_profile_page_account_restricted.png",
  ],
  ["/capture/profile-my-page-alt", "164_profile_my_page_alt.png"],
  ["/capture/profile-my-page-legacy", "165_profile_my_page_legacy.png"],
  ["/capture/profile-ad-hidden", "166_profile_ad_hidden.png"],
  ["/capture/profile-loading-skeleton", "167_profile_loading_skeleton.png"],
  ["/capture/signup-account-info", "168_signup_account_info.png"],
  ["/capture/signup-social-info", "169_signup_social_info.png"],
  ["/capture/signup-welcome", "170_signup_welcome.png"],
  ["/capture/signup-phone-number-step", "171_signup_phone_number_step.png"],
  ["/capture/signup-password-creation", "172_signup_password_creation.png"],
  [
    "/capture/signup-identity-verification",
    "173_signup_identity_verification.png",
  ],
  ["/capture/signup-account-info-alt", "174_signup_account_info_alt.png"],
  ["/capture/signup-complete", "175_signup_complete.png"],
  ["/capture/reading-source-unavailable", "176_reading_source_unavailable.png"],
  [
    "/capture/reading-certification-share-review",
    "177_reading_certification_share_review.png",
  ],
  ["/capture/reading-book-detail", "178_reading_book_detail.png"],
  ["/capture/reading-flow", "179_reading_flow.png"],
  ["/capture/reading-record-flow", "180_reading_record_flow.png"],
  [
    "/capture/reading-recommendation-error-empty",
    "181_reading_recommendation_error_empty.png",
  ],
  ["/capture/reading-start-confirm", "182_reading_start_confirm.png"],
  ["/capture/reading-in-progress", "183_reading_in_progress.png"],
  ["/capture/notice-event-detail", "184_notice_event_detail.png"],
  ["/capture/notice-ended-event-detail", "185_notice_ended_event_detail.png"],
  [
    "/capture/notice-privacy-policy-change",
    "186_notice_privacy_policy_change.png",
  ],
  ["/capture/notice-maintenance-detail", "187_notice_maintenance_detail.png"],
  ["/capture/notice-offline-list", "188_notice_offline_list.png"],
  ["/capture/notice-unavailable", "189_notice_unavailable.png"],
  ["/capture/notice-app-update-detail", "190_notice_app_update_detail.png"],
  ["/capture/notice-empty", "191_notice_empty.png"],
  ["/capture/news-mission-flow", "192_news_mission_flow.png"],
  ["/capture/news-share-review", "193_news_share_review.png"],
  ["/capture/news-offline-preview", "194_news_offline_preview.png"],
  ["/capture/news-flow", "195_news_flow.png"],
  ["/capture/news-record-input", "196_news_record_input.png"],
  ["/capture/news-content-load-error", "197_news_content_load_error.png"],
  ["/capture/news-issue-detail", "198_news_issue_detail.png"],
  [
    "/capture/profile-settings-validation-error",
    "199_profile_settings_validation_error.png",
  ],
  [
    "/capture/profile-settings-save-failure",
    "200_profile_settings_save_failure.png",
  ],
  ["/capture/profile-settings-alt", "201_profile_settings_alt.png"],
  ["/capture/profile-visibility-sheet", "202_profile_visibility_sheet.png"],
  [
    "/capture/profile-image-delete-confirm",
    "203_profile_image_delete_confirm.png",
  ],
  ["/capture/profile-uploading", "204_profile_uploading.png"],
  ["/capture/profile-job-selector", "205_profile_job_selector.png"],
  ["/capture/living-cost-save-failure", "206_living_cost_save_failure.png"],
  ["/capture/living-cost-saving", "207_living_cost_saving.png"],
  ["/capture/living-cost-settings", "208_living_cost_settings.png"],
  ["/capture/living-cost-alt", "209_living_cost_alt.png"],
  [
    "/capture/living-cost-weekday-weekend",
    "210_living_cost_weekday_weekend.png",
  ],
  ["/capture/living-cost-saving-alt", "211_living_cost_saving_alt.png"],
  ["/capture/news-mission-complete", "212_news_mission_complete.png"],
  ["/capture/health-already-complete", "213_health_already_complete.png"],
  ["/capture/news-already-complete", "214_news_already_complete.png"],
  ["/capture/reading-already-complete", "215_reading_already_complete.png"],
  ["/capture/workout-record-complete", "216_workout_record_complete.png"],
  ["/capture/mission-complete-xp", "217_mission_complete_xp.png"],
  ["/capture/xp-result-state-board", "218_xp_result_state_board.png"],
  ["/capture/fixed-expense-saving", "219_fixed_expense_saving.png"],
  [
    "/capture/fixed-expense-edit-inactive",
    "220_fixed_expense_edit_inactive.png",
  ],
  ["/capture/fixed-expense-save-failure", "221_fixed_expense_save_failure.png"],
  ["/capture/fixed-expense-register", "222_fixed_expense_register.png"],
  ["/capture/fixed-expense-add-detailed", "223_fixed_expense_add_detailed.png"],
  ["/capture/fixed-expense-edit", "224_fixed_expense_edit.png"],
  [
    "/capture/my-levelup-activity-records",
    "225_my_levelup_activity_records.png",
  ],
  ["/capture/my-levelup-record-detail", "226_my_levelup_record_detail.png"],
  ["/capture/my-levelup-empty-records", "227_my_levelup_empty_records.png"],
  ["/capture/my-levelup-statistics", "228_my_levelup_statistics.png"],
  ["/capture/my-levelup-offline-records", "229_my_levelup_offline_records.png"],
  ["/capture/my-levelup-xp-history", "230_my_levelup_xp_history.png"],
  ["/capture/inquiry-detail-answered", "231_inquiry_detail_answered.png"],
  ["/capture/inquiry-empty", "232_inquiry_empty.png"],
  ["/capture/inquiry-detail-pending", "233_inquiry_detail_pending.png"],
  ["/capture/inquiry-offline-preview", "234_inquiry_offline_preview.png"],
  ["/capture/inquiry-submitted", "235_inquiry_submitted.png"],
  ["/capture/inquiry-create", "236_inquiry_create.png"],
  [
    "/capture/terms-ad-data-separation-policy",
    "237_terms_ad_data_separation_policy.png",
  ],
  ["/capture/terms-detailed-consent", "238_terms_detailed_consent.png"],
  ["/capture/terms-fulltext", "239_terms_fulltext.png"],
  [
    "/capture/terms-personalized-ads-consent",
    "240_terms_personalized_ads_consent.png",
  ],
  ["/capture/terms-consent-alt", "241_terms_consent_alt.png"],
  ["/capture/terms-review", "242_terms_review.png"],
  ["/capture/english-daily-detail", "243_english_daily_detail.png"],
  ["/capture/english-learning-flow", "244_english_learning_flow.png"],
  [
    "/capture/english-record-success-flow",
    "245_english_record_success_flow.png",
  ],
  [
    "/capture/english-learning-session-flow",
    "246_english_learning_session_flow.png",
  ],
  [
    "/capture/payroll-amount-validation-error",
    "247_payroll_amount_validation_error.png",
  ],
  ["/capture/salary-amount-check", "248_salary_amount_check.png"],
  ["/capture/amount-input-error", "249_amount_input_error.png"],
  ["/capture/monthly-budget-over-limit", "250_monthly_budget_over_limit.png"],
  ["/capture/expense-delete-confirm-alt", "251_expense_delete_confirm_alt.png"],
  ["/capture/deletion-processing", "252_deletion_processing.png"],
  ["/capture/plan-save-success", "253_plan_save_success.png"],
  ["/capture/plan-save-success-alt", "254_plan_save_success_alt.png"],
  ["/capture/budget-plan-warning", "255_budget_plan_warning.png"],
  ["/capture/daily-budget-overrun", "256_daily_budget_overrun.png"],
  ["/capture/english-levelup-share", "257_english_levelup_share.png"],
  ["/capture/reading-levelup", "258_reading_levelup.png"],
  ["/capture/levelup-celebration", "259_levelup_celebration.png"],
  ["/capture/levelup-result", "260_levelup_result.png"],
  ["/capture/certification-share-review", "261_certification_share_review.png"],
  ["/capture/share-standard-blocked", "262_share_standard_blocked.png"],
  ["/capture/levelup-share-review", "263_levelup_share_review.png"],
  ["/capture/comment-report-reason", "264_comment_report_reason.png"],
  ["/capture/post-report-reason", "265_post_report_reason.png"],
  ["/capture/report-reason-selector", "266_report_reason_selector.png"],
  ["/capture/report-result-board", "267_report_result_board.png"],
  ["/capture/comment-report-success", "268_comment_report_success.png"],
  ["/capture/date-selection-collection", "269_date_selection_collection.png"],
  ["/capture/recurrence-selector", "270_recurrence_selector.png"],
  ["/capture/file-photo-attachment", "271_file_photo_attachment.png"],
  ["/capture/post-menu-collection", "272_post_menu_collection.png"],
  ["/capture/sort-filter", "273_sort_filter.png"],
  ["/capture/visibility-selector", "274_visibility_selector.png"],
  ["/capture/draft-exit-state-board", "275_draft_exit_state_board.png"],
  ["/capture/device-permission-guide", "276_device_permission_guide.png"],
  [
    "/capture/post-registration-result-board",
    "277_post_registration_result_board.png",
  ],
  ["/capture/withdrawal-final-confirm", "278_withdrawal_final_confirm.png"],
];

const responsiveCheckRoutes = [
  "/capture/splash",
  "/capture/login",
  "/capture/login-credential-error",
  "/capture/login-password-recovery",
  "/capture/login-logout-complete",
  "/capture/signup",
  "/capture/signup-account-info",
  "/capture/signup-social-info",
  "/capture/signup-welcome",
  "/capture/signup-phone-number-step",
  "/capture/signup-password-creation",
  "/capture/signup-identity-verification",
  "/capture/signup-account-info-alt",
  "/capture/signup-complete",
  "/capture/salary",
  "/capture/salary?focus=daily-budget",
  "/capture/salary-no-plan",
  "/capture/salary-compact",
  "/capture/salary-detailed",
  "/capture/salary-offline",
  "/capture/expense-form-edit",
  "/capture/expense-form-refund",
  "/capture/expense-form-validation",
  "/capture/expense-delete-blocked",
  "/capture/expense-invalidate-reason",
  "/capture/plan",
  "/capture/notifications",
  "/capture/notifications-empty",
  "/capture/notifications-offline",
  "/capture/notifications-error",
  "/capture/notifications-all-read",
  "/capture/notifications-no-unread-list",
  "/capture/notice-event-detail",
  "/capture/notice-ended-event-detail",
  "/capture/notice-privacy-policy-change",
  "/capture/notice-maintenance-detail",
  "/capture/notice-offline-list",
  "/capture/notice-unavailable",
  "/capture/notice-app-update-detail",
  "/capture/notice-empty",
  "/capture/level",
  "/capture/reading",
  "/capture/reading-source-unavailable",
  "/capture/reading-certification-share-review",
  "/capture/reading-book-detail",
  "/capture/reading-flow",
  "/capture/reading-record-flow",
  "/capture/reading-recommendation-error-empty",
  "/capture/reading-start-confirm",
  "/capture/reading-in-progress",
  "/capture/news",
  "/capture/news-mission-flow",
  "/capture/news-share-review",
  "/capture/news-offline-preview",
  "/capture/news-flow",
  "/capture/news-record-input",
  "/capture/news-content-load-error",
  "/capture/news-issue-detail",
  "/capture/english",
  "/capture/health",
  "/capture/health-safety-check",
  "/capture/health-offline-cached",
  "/capture/health-workout-detail",
  "/capture/health-safety-unavailable",
  "/capture/health-content-load-error",
  "/capture/health-workout-in-progress",
  "/capture/health-workout-flow",
  "/capture/health-workout-record",
  "/capture/health-flow",
  "/capture/onboarding-salary-amount-keypad",
  "/capture/onboarding-expected-salary-step",
  "/capture/onboarding-intro-alt",
  "/capture/onboarding-daily-budget-step",
  "/capture/onboarding-plan-review",
  "/capture/onboarding-payday-step",
  "/capture/onboarding-complete",
  "/capture/onboarding-fixed-expense-step",
  "/capture/onboarding-fixed-savings-step",
  "/capture/community",
  "/capture/community-state-board-ko",
  "/capture/community-state-board-en-tabs",
  "/capture/community-offline-moderation-board",
  "/capture/community-state-board",
  "/capture/community-hobby-board",
  "/capture/community-levelup-board",
  "/capture/community-search-results",
  "/capture/community-free-board-alt",
  "/capture/fixed-saving-add-goal",
  "/capture/fixed-saving-add-savings-goal",
  "/capture/fixed-saving-add-investment",
  "/capture/fixed-saving-saving",
  "/capture/fixed-saving-save-failure",
  "/capture/fixed-saving-edit-savings",
  "/capture/fixed-saving-edit-inactive",
  "/capture/fixed-saving-delete-confirm",
  "/capture/community-write",
  "/capture/community-post-detail",
  "/capture/community-post-offline",
  "/capture/community-post-comment-restricted",
  "/capture/community-post-blocked",
  "/capture/community-post-hidden",
  "/capture/community-post-load-error",
  "/capture/community-post-review-pending",
  "/capture/community-post-hobby",
  "/capture/community-post-deleted",
  "/capture/community-post-restricted",
  "/capture/community-write-attachments",
  "/capture/community-write-restricted",
  "/capture/community-write-draft",
  "/capture/community-write-from-levelup",
  "/capture/community-write-validation",
  "/capture/community-write-question-anonymous",
  "/capture/community-comments-load-error",
  "/capture/community-comment-edit",
  "/capture/community-reply-compose",
  "/capture/community-replies-expanded",
  "/capture/community-comment-list",
  "/capture/community-comments-loading-more",
  "/capture/community-comment-submitting",
  "/capture/community-comment-thread",
  "/capture/community-comment-thread-alt",
  "/capture/community-no-comments",
  "/capture/community-comment-thread-policy",
  "/capture/profile",
  "/capture/profile-performance-partial-error",
  "/capture/profile-offline-performance-preview",
  "/capture/profile-page-load-error",
  "/capture/profile-page-account-restricted",
  "/capture/profile-my-page-alt",
  "/capture/profile-my-page-legacy",
  "/capture/profile-ad-hidden",
  "/capture/profile-loading-skeleton",
  "/capture/profile-account-restricted",
  "/capture/profile-data-export-ready",
  "/capture/profile-withdrawal-requested",
  "/capture/profile-biometric-app-lock",
  "/capture/profile-withdrawal-reason",
  "/capture/profile-rejoin-blocked",
  "/capture/profile-data-export-processing",
  "/capture/profile-withdrawal-precheck",
  "/capture/profile-privacy-usage-history",
  "/capture/profile-data-export-request",
  "/capture/profile-password-change",
  "/capture/profile-account-settings-default",
  "/capture/profile-settings-validation-error",
  "/capture/profile-settings-save-failure",
  "/capture/profile-settings-alt",
  "/capture/profile-visibility-sheet",
  "/capture/profile-image-delete-confirm",
  "/capture/profile-uploading",
  "/capture/profile-job-selector",
  "/capture/living-cost-save-failure",
  "/capture/living-cost-saving",
  "/capture/living-cost-settings",
  "/capture/living-cost-alt",
  "/capture/living-cost-weekday-weekend",
  "/capture/living-cost-saving-alt",
  "/capture/news-mission-complete",
  "/capture/health-already-complete",
  "/capture/news-already-complete",
  "/capture/reading-already-complete",
  "/capture/workout-record-complete",
  "/capture/mission-complete-xp",
  "/capture/xp-result-state-board",
  "/capture/fixed-expense-saving",
  "/capture/fixed-expense-edit-inactive",
  "/capture/fixed-expense-save-failure",
  "/capture/fixed-expense-register",
  "/capture/fixed-expense-add-detailed",
  "/capture/fixed-expense-edit",
  "/capture/my-levelup-activity-records",
  "/capture/my-levelup-record-detail",
  "/capture/my-levelup-empty-records",
  "/capture/my-levelup-statistics",
  "/capture/my-levelup-offline-records",
  "/capture/my-levelup-xp-history",
  "/capture/inquiry-detail-answered",
  "/capture/inquiry-empty",
  "/capture/inquiry-detail-pending",
  "/capture/inquiry-offline-preview",
  "/capture/inquiry-submitted",
  "/capture/inquiry-create",
  "/capture/terms-ad-data-separation-policy",
  "/capture/terms-detailed-consent",
  "/capture/terms-fulltext",
  "/capture/terms-personalized-ads-consent",
  "/capture/terms-consent-alt",
  "/capture/terms-review",
  "/capture/english-daily-detail",
  "/capture/english-learning-flow",
  "/capture/english-record-success-flow",
  "/capture/english-learning-session-flow",
  "/capture/payroll-amount-validation-error",
  "/capture/salary-amount-check",
  "/capture/amount-input-error",
  "/capture/monthly-budget-over-limit",
  "/capture/expense-delete-confirm-alt",
  "/capture/deletion-processing",
  "/capture/plan-save-success",
  "/capture/plan-save-success-alt",
  "/capture/budget-plan-warning",
  "/capture/daily-budget-overrun",
  "/capture/english-levelup-share",
  "/capture/reading-levelup",
  "/capture/levelup-celebration",
  "/capture/levelup-result",
  "/capture/certification-share-review",
  "/capture/share-standard-blocked",
  "/capture/levelup-share-review",
  "/capture/comment-report-reason",
  "/capture/post-report-reason",
  "/capture/report-reason-selector",
  "/capture/report-result-board",
  "/capture/comment-report-success",
  "/capture/date-selection-collection",
  "/capture/recurrence-selector",
  "/capture/file-photo-attachment",
  "/capture/post-menu-collection",
  "/capture/sort-filter",
  "/capture/visibility-selector",
  "/capture/draft-exit-state-board",
  "/capture/device-permission-guide",
  "/capture/post-registration-result-board",
  "/capture/withdrawal-final-confirm",
  "/capture/modal-confirm",
  "/capture/bottom-sheet-category",
];

const responsiveViewportWidths = [320, 360, 375, 390, 393, 412, 430, 768];

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
]);

const chrome = findChrome();
const apiServer = createApiServer();
const webServer = createWebServer();

await ensureWebExportReady();
await listen(apiServer, apiPort);
await listen(webServer, webPort);

let browser = null;
try {
  const { chromium } = await loadPlaywright();
  browser = await chromium.launch({
    executablePath: chrome,
    headless: true,
  });

  await mkdir(screenshotDir, { recursive: true });
  await mkdir(mobileUiEvidenceDir, { recursive: true });

  const selectedStoreCaptures = filterCaptures(storeCaptures);
  const selectedMobileUiEvidenceCaptures = filterCaptures(
    mobileUiEvidenceCaptures,
  );
  const selectedResponsiveCheckRoutes = filterCaptures(
    responsiveCheckRoutes.map((route) => [route, route]),
  ).map(([route]) => route);

  for (const [
    route,
    fileName,
    viewport = phoneViewport,
    scale = phoneScale,
  ] of selectedStoreCaptures) {
    const outputPath = path.join(screenshotDir, fileName);
    await capture(browser, route, outputPath, viewport, scale);
  }

  const responsiveChecks = [];
  for (const route of selectedResponsiveCheckRoutes) {
    for (const width of responsiveViewportWidths) {
      responsiveChecks.push(await checkResponsive(browser, route, width));
    }
  }

  for (const [
    route,
    fileName,
    viewport = phoneViewport,
    scale = phoneScale,
  ] of selectedMobileUiEvidenceCaptures) {
    const outputPath = path.join(mobileUiEvidenceDir, fileName);
    await capture(browser, route, outputPath, viewport, scale);
  }

  const summary = [];
  for (const [, fileName] of selectedStoreCaptures) {
    const filePath = path.join(screenshotDir, fileName);
    const png = await readFile(filePath);
    summary.push({
      group: "store",
      file: fileName,
      ...pngSize(png),
      bytes: png.length,
    });
  }
  for (const [, fileName] of selectedMobileUiEvidenceCaptures) {
    const filePath = path.join(mobileUiEvidenceDir, fileName);
    const png = await readFile(filePath);
    summary.push({
      group: "mobile-ui",
      file: fileName,
      ...pngSize(png),
      bytes: png.length,
    });
  }
  const summaryFileName = captureOnlyFilter
    ? "capture-summary.partial.json"
    : "capture-summary.json";
  await writeFile(
    path.join(mobileUiEvidenceDir, summaryFileName),
    `${JSON.stringify(
      {
        ok: true,
        partial: Boolean(captureOnlyFilter),
        filter: captureOnlyFilter || null,
        generatedAt: new Date().toISOString(),
        screenshotDir: path.relative(rootDir, screenshotDir),
        mobileUiEvidenceDir: path.relative(rootDir, mobileUiEvidenceDir),
        count: summary.length,
        storeCount: selectedStoreCaptures.length,
        mobileUiEvidenceCount: selectedMobileUiEvidenceCaptures.length,
        responsiveCheckCount: responsiveChecks.length,
        responsiveChecks,
        summary,
      },
      null,
      2,
    )}\n`,
  );
  console.log(JSON.stringify({ ok: true, responsiveChecks, summary }, null, 2));
} finally {
  if (browser !== null) await browser.close();
  await close(webServer);
  await close(apiServer);
}

function createApiServer() {
  return createServer((request, response) => {
    setApiCorsHeaders(request, response);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url ?? "/", `http://127.0.0.1:${apiPort}`);
    if (url.pathname === "/api/v1/growth/contents") {
      json(response, 200, {
        data: {
          items: mockGrowthContents(
            url.searchParams.get("contentType") ?? "READING",
          ),
          page: 1,
          pageSize: 20,
          total: 1,
        },
      });
      return;
    }

    if (url.pathname === "/api/v1/public/app-config") {
      json(response, 200, mockPublicAppConfig());
      return;
    }

    if (url.pathname === "/api/v1/daily-budgets/today") {
      json(response, 200, mockDailyBudget());
      return;
    }

    if (url.pathname === "/api/v1/variable-expenses") {
      json(response, 200, mockVariableExpenses());
      return;
    }

    if (url.pathname === "/api/v1/fixed-expenses") {
      json(response, 200, mockFixedExpenses());
      return;
    }

    if (url.pathname === "/api/v1/savings") {
      json(response, 200, mockSavingsGoals());
      return;
    }

    if (url.pathname === "/api/v1/payroll/current") {
      json(response, 200, mockCurrentPayroll());
      return;
    }

    if (url.pathname === "/api/v1/notifications") {
      json(response, 200, mockNotifications());
      return;
    }

    if (url.pathname === "/api/v1/notifications/unread-count") {
      json(response, 200, { data: { unreadCount: 2, serverAuthority: true } });
      return;
    }

    if (url.pathname === "/api/v1/notifications/preferences") {
      json(response, 200, mockNotificationPreferences());
      return;
    }

    if (url.pathname === "/api/v1/notifications/devices") {
      json(response, 200, mockNotificationDevices());
      return;
    }

    if (url.pathname === "/api/v1/users/me/profile") {
      json(response, 200, mockUserProfile());
      return;
    }

    if (url.pathname === "/api/v1/users/me/my-page-summary") {
      json(response, 200, mockMyPageSummary());
      return;
    }

    if (url.pathname === "/api/v1/users/me/privacy-exports") {
      json(response, 200, {
        data: { items: [], page: 1, pageSize: 20, total: 0 },
      });
      return;
    }

    if (url.pathname === "/api/v1/users/consents") {
      json(response, 200, mockUserConsents());
      return;
    }

    if (url.pathname === "/api/v1/community/posts") {
      json(response, 200, mockCommunityPosts());
      return;
    }

    if (url.pathname === "/api/v1/community/bookmarks") {
      json(response, 200, {
        data: { items: [], page: 1, pageSize: 20, total: 0 },
      });
      return;
    }

    if (url.pathname !== "/api/v1/mobile/bootstrap") {
      json(response, 404, { error: { message: "mock route not found" } });
      return;
    }

    json(response, 200, {
      data: {
        session: {
          authenticated: true,
          userIdHash: "sha256:store-screenshot-sample",
          role: "USER",
          emailVerified: true,
          onboardingCompleted: true,
          mfaRequired: false,
          sessionExpiresAt: null,
          rawFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          rawPushTokenExposed: false,
          adsFinancialTargetingUsed: false,
        },
        config: {
          apiVersion: "v1",
          environment: "development",
          maintenanceMode: false,
          minSupportedBuild: "0",
          defaultRoute: "/salary",
          featureFlags: {
            payroll: true,
            dailyBudgets: true,
            fixedExpenses: true,
            variableExpenses: true,
            savings: true,
            notifications: true,
            growth: true,
            community: true,
            contextualAdsOnly: true,
          },
          serverAuthorityEnabled: true,
          privacyMode: "STRICT",
          adsFinancialTargetingAllowed: false,
        },
        push: {
          consent: "GRANTED",
          tokenRegistered: true,
          quietHoursEnabled: true,
          rawPushTokenExposed: false,
          adsFinancialTargetingUsed: false,
        },
      },
    });
  });
}

function setApiCorsHeaders(request, response) {
  const origin = request.headers.origin ?? `http://127.0.0.1:${webPort}`;
  response.setHeader("access-control-allow-origin", origin);
  response.setHeader("access-control-allow-credentials", "true");
  response.setHeader(
    "access-control-allow-methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );
  response.setHeader("access-control-allow-headers", "*");
  response.setHeader("vary", "origin");
  response.setHeader("cache-control", "no-store");
}

function mockPublicAppConfig() {
  return {
    data: {
      links: {
        landingUrl: "https://salaryhijacking.com/",
        partnerBenefitsUrl: "https://salaryhijacking.com/partners",
        privacyUrl: "https://salaryhijacking.com/privacy",
        supportUrl: "https://salaryhijacking.com/support",
        termsUrl: "https://salaryhijacking.com/terms",
      },
      privacy: {
        rawPayrollDataForAds: false,
        rawExpenseDataForAds: false,
        rawSavingsDataForAds: false,
        advertiserUserIdentifierExposure: false,
      },
      ads: {
        contextualOnly: true,
        adLabelRequired: true,
        financialTargetingUsed: false,
        sensitiveFinancialTargetingAllowed: false,
        partnerDisclosureRequired: true,
      },
      serverAuthority: {
        apiPrefix: "/api/v1",
        payrollBudgetExpenseSavingsSource: "server",
        clientMayCalculateAuthoritativeMoney: false,
        krwIntegerOnly: true,
        negativeMoneyAllowed: false,
        fractionalMoneyAllowed: false,
      },
    },
  };
}

function mockDailyBudget() {
  return {
    data: {
      budgetDate: "2026-07-11",
      plannedAmountMinor: 30000,
      adjustmentAmountMinor: 0,
      availableAmountMinor: 30000,
      spentAmountMinor: 23000,
      remainingAmountMinor: 7000,
      usageRate: 0.77,
      status: "WATCH",
      updatedAt: "2026-07-10T18:00:00.000Z",
      serverAuthority: true,
    },
  };
}

function mockVariableExpenses() {
  return {
    data: {
      items: [
        {
          expenseId: "vex_lunch",
          title: "Lunch",
          category: "FOOD",
          amountMinor: 12000,
          spentAt: "2026-07-11T03:20:00.000Z",
          memo: null,
          serverAuthority: true,
          financialRawDataExposed: false,
        },
        {
          expenseId: "vex_coffee",
          title: "Coffee",
          category: "CAFE",
          amountMinor: 4500,
          spentAt: "2026-07-11T05:10:00.000Z",
          memo: null,
          serverAuthority: true,
          financialRawDataExposed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 2,
    },
  };
}

function mockFixedExpenses() {
  return {
    data: {
      items: [
        {
          expenseId: "expense_subscription",
          title: "Subscription",
          category: "SUBSCRIPTION",
          amountMinor: 30000,
          frequency: "MONTHLY",
          paymentDay: 20,
          status: "ACTIVE",
          serverAuthority: true,
          financialRawDataExposed: false,
        },
        {
          expenseId: "expense_utility",
          title: "Utility",
          category: "UTILITY",
          amountMinor: 70000,
          frequency: "MONTHLY",
          paymentDay: 25,
          status: "ACTIVE",
          serverAuthority: true,
          financialRawDataExposed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 2,
    },
  };
}

function mockSavingsGoals() {
  return {
    data: {
      items: [
        {
          goalId: "goal_emergency",
          title: "Emergency reserve",
          goalType: "EMERGENCY_FUND",
          targetAmountMinor: 1000000,
          currentAmountMinor: 120000,
          fixedSaveAmountMinor: 150000,
          status: "ACTIVE",
          serverAuthority: true,
          financialRawAccountDataExposed: false,
        },
        {
          goalId: "goal_growth",
          title: "Growth fund",
          goalType: "CUSTOM",
          targetAmountMinor: 2000000,
          currentAmountMinor: 500000,
          fixedSaveAmountMinor: 200000,
          status: "ACTIVE",
          serverAuthority: true,
          financialRawAccountDataExposed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 2,
    },
  };
}

function mockCurrentPayroll() {
  return {
    data: {
      planId: "plan_2026_07",
      title: "July payroll plan",
      incomeType: "NET",
      payrollCycle: "MONTHLY",
      payrollAmountMinor: 2700000,
      payday: 25,
      firstPayrollDate: "2026-07-25",
      periodStartDate: "2026-07-01",
      periodEndDate: "2026-07-31",
      fixedExpenseTotalMinor: 650000,
      fixedSavingsTotalMinor: 500000,
      variableExpenseReserveMinor: 620000,
      emergencyBufferMinor: 100000,
      carryOverAmountMinor: 50000,
      reservePolicy: "ZERO_BASE",
      memo: null,
      status: "ACTIVE",
      calculation: {
        periodStartDate: "2026-07-01",
        periodEndDate: "2026-07-31",
        dayCount: 31,
        payrollAmountMinor: 2700000,
        fixedExpenseTotalMinor: 650000,
        fixedSavingsTotalMinor: 500000,
        variableExpenseReserveMinor: 620000,
        emergencyBufferMinor: 100000,
        carryOverAmountMinor: 50000,
        alreadySpentAmountMinor: 0,
        totalDeductionsMinor: 1870000,
        availableBeforeSpentMinor: 880000,
        availableForDailyBudgetMinor: 880000,
        recommendedDailyBudgetMinor: 28387,
        remainderMinor: 3,
        hijackRate: 0.6926,
        serverAuthority: true,
        financialRawDataExposed: false,
      },
      serverAuthority: true,
      financialRawDataExposed: false,
      adTargetingSeparated: true,
    },
  };
}

function mockNotifications() {
  return {
    data: {
      items: [
        {
          notificationId: "ntf_budget_warning",
          type: "BUDGET_WARNING",
          title: "Budget watch",
          message: "Today's remaining budget is low. Check before spending.",
          priority: "HIGH",
          channels: "IN_APP,PUSH",
          deeplink: "/salary",
          status: "UNREAD",
          scheduledAt: null,
          expiresAt: null,
          metadata: { category: "budget" },
          createdAt: "2026-07-10T23:00:00.000Z",
          readAt: null,
          archivedAt: null,
          sensitiveFinancialDataExposed: false,
          adTargetingSeparated: true,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    },
  };
}

function mockNotificationPreferences() {
  return {
    data: {
      inAppEnabled: true,
      pushEnabled: true,
      emailEnabled: false,
      paydayEnabled: true,
      paymentDueEnabled: true,
      budgetWarningEnabled: true,
      budgetExceededEnabled: true,
      savingsGoalEnabled: true,
      levelUpEnabled: true,
      communityEnabled: true,
      securityEnabled: true,
      contentRecommendationEnabled: false,
      adPartnerEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      timezone: "Asia/Seoul",
      sensitiveFinancialTargetingConsent: false,
      updatedAt: "2026-07-10T23:10:00.000Z",
    },
  };
}

function mockNotificationDevices() {
  return {
    data: {
      items: [
        {
          deviceId: "device_preview_web",
          platform: "web",
          pushProvider: "EXPO",
          status: "ACTIVE",
          registeredAt: "2026-07-10T23:10:00.000Z",
          lastSeenAt: "2026-07-10T23:20:00.000Z",
          rawPushTokenExposed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    },
  };
}

function mockUserProfile() {
  return {
    data: {
      user: {
        idHash: "sha256:1234567890abcdef1234567890abcdef",
        nickname: "Salary Guardian",
        role: "USER",
        emailVerified: true,
        onboardingCompleted: true,
        joinedAt: "2026-07-02T09:00:00.000Z",
        level: 18,
        title: "Salary Guardian",
        avatarEmoji: "SH",
        marketingConsent: false,
        notificationConsent: true,
        communityDisplayName: "Guardian",
        rawEmailExposed: false,
        rawPhoneExposed: false,
        rawFinancialDataExposed: false,
        rawPushTokenExposed: false,
        adsFinancialTargetingUsed: false,
      },
      summary: {
        totalHijackSaved: 5780000,
        currentMonthHijack: 1927000,
        currentLevel: 18,
        levelXp: 420,
        nextLevelXp: 999,
        selfCareScore: 91,
        completedGrowthTasks: 11,
        communityPosts: 3,
        communityComments: 4,
        notificationUnread: 2,
        privacyPassRate: "100.00%",
      },
      privacy: {
        exportStatus: "NONE",
        exportRequestedAt: null,
        withdrawalRequested: false,
        adPersonalization: false,
        financialDataForAds: false,
        rawPushTokenLogging: false,
        tokenHashOnly: true,
      },
      activities: [
        {
          id: "activity_profile_viewed",
          kind: "NOTICE",
          title: "PROFILE_VIEWED",
          description: "Account activity processed by the server.",
          createdAt: "2026-07-10T23:10:00.000Z",
          route: "/profile",
          rawFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          adsFinancialTargetingUsed: false,
        },
      ],
    },
  };
}

function mockMyPageSummary() {
  return {
    data: {
      adPartnerAccepted: false,
      adsFinancialTargetingUsed: false,
      communityComments: 4,
      communityPosts: 3,
      contentRecommendationAccepted: true,
      financialRawDataExposed: false,
      latestExportRequestedAt: "2026-07-03T06:00:00.000Z",
      latestExportStatus: "READY",
      level: 18,
      levelXp: 420,
      nextActions: "Profile ready; review LV UP routine",
      notificationUnread: 2,
      privacyExportCount: 2,
      profileCompleted: true,
      rawPersonalDataExposed: false,
      rawTokenExposed: false,
      selfCareScore: 91,
      sensitiveFinancialTargetingAccepted: false,
      status: "ACTIVE",
      theme: "DARK",
      totalExp: 1740,
    },
  };
}

function mockUserConsents() {
  return {
    data: {
      marketingConsent: false,
      notificationConsent: true,
      adPersonalizationConsent: false,
      sensitiveFinancialTargetingConsent: false,
      updatedAt: "2026-07-10T23:10:00.000Z",
    },
  };
}

function mockCommunityPosts() {
  return {
    data: {
      items: [
        {
          postId: "post_preview_1",
          boardType: "FREE",
          title: "Budget routine check",
          excerpt: "Share one small routine that helped this week.",
          authorDisplayName: "Guardian",
          likeCount: 12,
          commentCount: 3,
          bookmarked: false,
          liked: false,
          createdAt: "2026-07-10T23:10:00.000Z",
          sensitiveFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          adsFinancialTargetingUsed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    },
  };
}

function mockGrowthContents(contentType) {
  const normalized = String(contentType).toUpperCase();
  const itemByType = {
    READING: {
      contentId: "00000000-0000-4000-8000-000000002501",
      contentType: "READING",
      title: "Money habit checklist reading",
      subtitle: "Read an operator summary and choose one habit to test.",
      category: "ECONOMY_BUSINESS",
      difficulty: "EASY",
      estimatedMinutes: 8,
      topics: ["budget", "habit", "reflection"],
      summary:
        "Owned operator summary about noticing one repeat spending habit before payday.",
      missionPrompt:
        "Choose one budget habit from the summary and write how you will test it today.",
      recordQuestion: "Which one spending habit will you observe today?",
      sourceTitle: "Salary Hijacking owned reading brief",
      sourceAuthor: "Salary Hijacking Editorial",
      sourceName: "Salary Hijacking",
      sourceUrl:
        "https://salaryhijacking.com/level/reading/money-habit-checklist",
      licenseType: "OWNED_CONTENT",
      safetyLevel: "GENERAL",
      viewpointTag: null,
      xpReward: 20,
      status: "PUBLISHED",
    },
    NEWS: {
      contentId: "00000000-0000-4000-8000-000000002502",
      contentType: "NEWS",
      title: "Balanced money news brief",
      subtitle: "Practice source-centered reading without political labels.",
      category: "NEWS_LITERACY",
      difficulty: "NORMAL",
      estimatedMinutes: 10,
      topics: ["news", "source", "budget"],
      summary:
        "Owned brief about comparing facts, uncertainty, and source evidence before budget decisions.",
      missionPrompt:
        "Write one fact, one uncertainty, and one budget action you would delay.",
      recordQuestion: "What fact did the source actually support?",
      sourceTitle: "Salary Hijacking source balance method",
      sourceAuthor: "Salary Hijacking Editorial",
      sourceName: "Salary Hijacking",
      sourceUrl: "https://salaryhijacking.com/level/news/source-balance-method",
      licenseType: "OWNED_CONTENT",
      safetyLevel: "GENERAL",
      viewpointTag: "FACT_BRIEF",
      xpReward: 25,
      status: "PUBLISHED",
    },
    ENGLISH: {
      contentId: "00000000-0000-4000-8000-000000002503",
      contentType: "ENGLISH",
      title: "Payday five sentence practice",
      subtitle: "Listen, read, speak, and write five owned sentences.",
      category: "ENGLISH_FINANCE",
      difficulty: "EASY",
      estimatedMinutes: 7,
      topics: ["english", "payday", "sentence"],
      summary:
        "Owned English practice with five salary and budget sentences for private learning.",
      missionPrompt:
        "Practice the five sentences, then write one sentence about your next payday plan.",
      recordQuestion: "Which sentence was easiest to say aloud?",
      sourceTitle: "Salary Hijacking owned English set",
      sourceAuthor: "Salary Hijacking Editorial",
      sourceName: "Salary Hijacking",
      sourceUrl:
        "https://salaryhijacking.com/level/english/payday-five-sentences",
      licenseType: "OWNED_CONTENT",
      safetyLevel: "GENERAL",
      viewpointTag: null,
      xpReward: 20,
      status: "PUBLISHED",
    },
    HEALTH: {
      contentId: "00000000-0000-4000-8000-000000002504",
      contentType: "HEALTH",
      title: "Desk recovery starter routine",
      subtitle: "A beginner safe timer checklist for light movement.",
      category: "HEALTH_ROUTINE",
      difficulty: "EASY",
      estimatedMinutes: 9,
      topics: ["health", "timer", "recovery"],
      summary:
        "Owned beginner routine for gentle desk recovery. Stop if pain appears.",
      missionPrompt:
        "Run the timer checklist once and record whether any movement felt uncomfortable.",
      recordQuestion: "Did any movement cause pain or discomfort?",
      sourceTitle: "Salary Hijacking owned desk recovery routine",
      sourceAuthor: "Salary Hijacking Editorial",
      sourceName: "Salary Hijacking",
      sourceUrl:
        "https://salaryhijacking.com/level/health/desk-recovery-routine",
      licenseType: "OWNED_CONTENT",
      safetyLevel: "BEGINNER_SAFE",
      viewpointTag: null,
      xpReward: 20,
      status: "PUBLISHED",
    },
  };
  const item = itemByType[normalized] ?? itemByType.READING;
  return [
    {
      ...item,
      fullTextStored: false,
      adTargetingSeparated: true,
      recommendationUsesSensitiveFinancialData: false,
      financialRawDataExposed: false,
      serverAuthority: true,
      auditReasonRequired: true,
    },
  ];
}

function createWebServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://127.0.0.1:${webPort}`);
      if (url.pathname === "/__feature-graphic") {
        response.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        });
        response.end(officialFeatureGraphicHtml());
        return;
      }

      if (url.pathname === "/__brand-logo") {
        const logo = await readFile(officialLogoPath);
        response.writeHead(200, {
          "content-type": "image/png",
          "cache-control": "no-store",
        });
        response.end(logo);
        return;
      }

      const requested = decodeURIComponent(url.pathname);
      const target = path.resolve(
        distDir,
        requested === "/" ? "index.html" : requested.slice(1),
      );
      const safeTarget = target.startsWith(distDir) ? target : "";
      const resolved =
        safeTarget && (await existsFile(safeTarget))
          ? safeTarget
          : path.join(distDir, "index.html");
      const body = await readFile(resolved);
      response.writeHead(200, {
        "content-type":
          contentTypes.get(path.extname(resolved)) ??
          "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(body);
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : "server error");
    }
  });
}

async function capture(browser, route, outputPath, viewport, scale) {
  const [routeWithoutHash, hash = ""] = route.split("#");
  const separator = routeWithoutHash.includes("?") ? "&" : "?";
  const url =
    `http://127.0.0.1:${webPort}${routeWithoutHash}${separator}capture=${Date.now()}` +
    (hash ? `#${hash}` : "");
  const [width, height] = viewport.split(",").map((value) => Number(value));
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: Number(scale),
  });
  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error instanceof Error ? error.message : String(error));
  });

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    if (response !== null && response.status() >= 400) {
      throw new Error(
        `HTTP ${response.status()} while capturing ${route}. Run export:web before capture if apps/mobile/dist/index.html is missing.`,
      );
    }
    await page
      .waitForFunction(() => document.body.innerText.trim().length > 0, null, {
        timeout: 15000,
      })
      .catch(() => undefined);
    await page.waitForTimeout(1200);
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (isServerErrorText(bodyText)) {
      throw new Error(
        `Server error page while capturing ${route}: ${bodyText.slice(0, 240)}`,
      );
    }
    if (pageErrors.length > 0) {
      throw new Error(
        `Page errors while capturing ${route}: ${pageErrors.join("; ")}`,
      );
    }
    await page.screenshot({
      animations: "disabled",
      fullPage: false,
      path: outputPath,
    });
  } finally {
    await page.close();
  }
}

async function checkResponsive(browser, route, width) {
  const routeWithoutHash = route.split("#")[0] ?? route;
  const separator = routeWithoutHash.includes("?") ? "&" : "?";
  const url = `http://127.0.0.1:${webPort}${routeWithoutHash}${separator}responsive=${width}`;
  const page = await browser.newPage({
    viewport: { width, height: 932 },
    deviceScaleFactor: 1,
  });
  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error instanceof Error ? error.message : String(error));
  });

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    if (response !== null && response.status() >= 400) {
      throw new Error(`HTTP ${response.status()} while checking ${route}`);
    }
    await page
      .waitForFunction(() => document.body.innerText.trim().length > 0, null, {
        timeout: 15000,
      })
      .catch(() => undefined);
    await page.waitForTimeout(500);
    const metrics = await page.evaluate(() => {
      const body = document.body;
      const root = document.documentElement;
      const maxRight = Math.max(
        body.scrollWidth,
        root.scrollWidth,
        ...[...document.querySelectorAll("*")].map((element) => {
          const rect = element.getBoundingClientRect();
          return Number.isFinite(rect.right) ? rect.right : 0;
        }),
      );
      const minLeft = Math.min(
        0,
        ...[...document.querySelectorAll("*")].map((element) => {
          const rect = element.getBoundingClientRect();
          return Number.isFinite(rect.left) ? rect.left : 0;
        }),
      );
      return {
        bodyTextLength: body.innerText.trim().length,
        maxRight,
        minLeft,
        scrollHeight: Math.max(body.scrollHeight, root.scrollHeight),
        scrollWidth: Math.max(body.scrollWidth, root.scrollWidth),
        viewportWidth: window.innerWidth,
      };
    });
    const horizontalOverflow =
      metrics.scrollWidth > width + 2 ||
      metrics.maxRight > width + 2 ||
      metrics.minLeft < -2;
    if (pageErrors.length > 0 || metrics.bodyTextLength === 0) {
      throw new Error(
        `Responsive check failed for ${route} at ${width}: ${pageErrors.join("; ")}`,
      );
    }
    return {
      horizontalOverflow,
      ok: !horizontalOverflow,
      route,
      width,
      ...metrics,
    };
  } finally {
    await page.close();
  }
}

async function ensureWebExportReady() {
  const indexPath = path.join(distDir, "index.html");
  if (!(await existsFile(indexPath))) {
    throw new Error(
      `Missing Expo web export at apps/mobile/dist/index.html. Run export:web before capture.`,
    );
  }
}

function isServerErrorText(text) {
  return /ENOENT|server error|apps[/\\]mobile[/\\]dist[/\\]index\.html/i.test(
    text,
  );
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("playwright")) {
      throw error;
    }
  }

  const pnpmDir = path.join(rootDir, "node_modules", ".pnpm");
  const entries = await readdir(pnpmDir, { withFileTypes: true });
  const playwrightEntry = entries
    .filter(
      (entry) => entry.isDirectory() && entry.name.startsWith("playwright@"),
    )
    .map((entry) => entry.name)
    .sort()
    .at(-1);
  if (!playwrightEntry) {
    throw new Error("Unable to locate Playwright in node_modules/.pnpm.");
  }
  return import(
    pathToFileURL(
      path.join(
        pnpmDir,
        playwrightEntry,
        "node_modules",
        "playwright",
        "index.mjs",
      ),
    ).href
  );
}

function officialFeatureGraphicHtml() {
  return `<!doctype html>
<html lang="ko">
<meta charset="utf-8" />
<style>
body{margin:0;width:1024px;height:500px;background:#f7f8fa;font-family:Arial,'Noto Sans KR',sans-serif;color:#202327;overflow:hidden}
.wrap{display:flex;height:100%;align-items:center;gap:44px;padding:0 58px;box-sizing:border-box}
.copy{flex:1}.brand{display:flex;align-items:center;gap:20px}.brand img{width:136px;height:136px;object-fit:contain;border-radius:44px;background:white;box-shadow:0 14px 36px rgba(15,35,25,.12)}.k{color:#209252;font-weight:900;font-size:18px;letter-spacing:.08em}.h{font-size:50px;line-height:1.13;font-weight:900;margin:24px 0 14px}.p{font-size:21px;line-height:1.45;color:#4b535b;font-weight:700}.pill{display:inline-block;margin-top:20px;padding:12px 18px;border-radius:999px;background:#eaf6ef;color:#12663a;font-weight:900}
.phone{width:262px;height:430px;border-radius:34px;background:white;border:1px solid #e7ebef;box-shadow:0 18px 46px rgba(15,35,25,.16);overflow:hidden}
.bar{height:48px;background:#fff;border-bottom:1px solid #eef0f2;display:flex;align-items:center;gap:8px;padding:0 18px;box-sizing:border-box}.bar img{width:28px;height:28px;object-fit:contain;border-radius:10px}.bar b{font-size:11px;color:#209252}
.card{margin:18px;padding:18px;border-radius:20px;background:#fff;border:1px solid #eef0f2;box-shadow:0 8px 24px rgba(15,35,25,.06)}.money{font-size:30px;font-weight:900}.muted{color:#6d737a;font-size:14px;font-weight:700}.line{height:10px;background:#eaf6ef;border-radius:999px;margin-top:14px}.line b{display:block;width:72%;height:100%;background:#209252;border-radius:999px}.mini{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 18px}.mini div{border:1px solid #eef0f2;border-radius:16px;padding:10px;font-size:12px;font-weight:800;color:#4b535b}.mini strong{display:block;color:#202327;font-size:13px;margin-top:4px;white-space:nowrap}
</style>
<div class="wrap"><div class="copy"><div class="brand"><img src="/__brand-logo" alt="Salary Hijacking official BI"/><div><div class="k">SALARY HIJACKING</div><div class="p">Clean Fintech v1</div></div></div><div class="h">&#xC6D4;&#xAE09;&#xC774; &#xC0AC;&#xB77C;&#xC9C0;&#xAE30; &#xC804;&#xC5D0;<br/>&#xBA3C;&#xC800; &#xBD99;&#xC7A1;&#xC544;&#xC694;</div><div class="p">&#xAE09;&#xC5EC;&middot;&#xC608;&#xC0B0;&middot;&#xC9C0;&#xCD9C;&middot;&#xC800;&#xCD95;&#xC744; &#xD55C; &#xBC88;&#xC5D0; &#xC815;&#xB9AC;&#xD558;&#xB294; green fintech &#xC571;</div><div class="pill">&#xC774;&#xBC88; &#xB2EC; &#xB0B4;&#xAC00; &#xC9C0;&#xCF1C;&#xB0B8; &#xB3C8; 5,780,000&#xC6D0;</div></div><div class="phone"><div class="bar"><img src="/__brand-logo" alt=""/><b>SALARY HIJACKING</b></div><div class="card"><div class="muted">&#xC774;&#xBC88; &#xB2EC; &#xB0B4;&#xAC00; &#xC9C0;&#xCF1C;&#xB0B8; &#xB3C8;</div><div class="money">5,780,000&#xC6D0;</div><div class="line"><b></b></div></div><div class="card"><div class="muted">&#xC624;&#xB298; &#xC4F8; &#xC218; &#xC788;&#xB294; &#xB3C8;</div><div class="money">7,000&#xC6D0;</div><div class="line"><b style="width:65%"></b></div></div><div class="mini"><div>&#xC218;&#xB839;<strong>2,700,000&#xC6D0;</strong></div><div>&#xB0A9;&#xCE58;<strong>1,927,000&#xC6D0;</strong></div></div></div></div>
</html>`;
}

function json(response, status, value) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

async function existsFile(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function pngSize(buffer) {
  if (
    buffer.length < 24 ||
    buffer.readUInt32BE(0) !== 0x89504e47 ||
    buffer.readUInt32BE(4) !== 0x0d0a1a0a
  ) {
    throw new Error("invalid PNG output");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function findChrome() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const candidate of candidates) {
    if (process.platform === "win32") {
      if (existsSync(candidate)) return candidate;
    }
  }
  return process.env.CHROME_BIN ?? "chrome";
}
