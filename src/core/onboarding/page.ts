export function welcomePageUrl(): string {
  return browser.runtime.getURL('/welcome.html');
}

export function openWelcomePage(): void {
  void browser.tabs.create({ url: welcomePageUrl() });
}
