/**
 * Who runs this app and who helps run it — shown in the privacy policy
 * and terms. Keep it true: when something here changes (a new server,
 * an email provider, a partner), update it, bump `lastUpdated`, and bump
 * POLICY_VERSION in api/src/common/policy.ts if the change matters.
 *
 * TODO before a wider launch: fill in `operator` and `country`.
 */
export const LEGAL = {
  /** Your full legal name (or your company's), as the person responsible for the data. */
  operator: '[your full legal name]',
  /** Where people can reach you about their data, and to report illegal content. */
  contactEmail: 'an.pelekanos@icloud.com',
  /** Your country — decides which law applies. */
  country: '[your country]',
  /**
   * The data-protection authority of that country. Cyprus: "Commissioner
   * for Personal Data Protection" / https://www.dataprotection.gov.cy —
   * Greece: "Hellenic Data Protection Authority" / https://www.dpa.gr
   */
  authority: { name: '[data-protection authority of your country]', url: '' },
  /**
   * Where the server runs. While it's on your own PC say so; once you rent
   * a server, name the company and country (e.g. "Hetzner Online GmbH, Germany").
   */
  hosting: 'a computer operated by us (we will name our hosting provider here once we move to a rented server)',
  /** Traffic passes through this network provider. */
  network: 'Cloudflare, Inc. (USA)',
  /** Who sends password-reset emails, or null while none is set up. */
  emailProvider: null as string | null,
  /**
   * Partners that receive data from people who switched "share with
   * partners" on — each with what they get and why. Empty = nobody yet.
   */
  partners: [] as { name: string; country: string; purpose: string }[],
  /** Bump when you change either page. */
  lastUpdated: '3 October 2026',
};
