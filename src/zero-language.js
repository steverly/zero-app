const STORAGE_KEY = "zero_language_v1";

export const ZERO_LANGUAGES = [
  {
    id: "fr",
    label: "Français",
    native: "Français",
    hint: "Zero parle français",
  },
  {
    id: "en",
    label: "English",
    native: "English",
    hint: "Zero speaks English",
  },
  {
    id: "id",
    label: "Bahasa Indonesia",
    native: "Bahasa Indonesia",
    hint: "Zero berbicara bahasa Indonesia",
  },
];

export function loadZeroLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    return ZERO_LANGUAGES.some(
      (language) => language.id === saved
    )
      ? saved
      : "fr";
  } catch {
    return "fr";
  }
}

export function saveZeroLanguage(language) {
  if (
    !ZERO_LANGUAGES.some(
      (item) => item.id === language
    )
  ) {
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      language
    );
  } catch {
    // ignore
  }
}
