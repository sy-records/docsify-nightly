/**
 * Resolve a link value using the same URL normalization as an anchor element.
 *
 * @param {string} href Link value
 * @returns {string}
 */
export function resolveHref(href: string): string;
/**
 * Find an anchor by its normalized URL without interpolating the URL into a
 * CSS selector.
 *
 * @param {Element} rootElm Element to search within
 * @param {string} href Link value
 * @param {string} [selector] Anchor selector
 * @returns {HTMLAnchorElement|null}
 */
export function findLinkByHref(rootElm: Element, href: string, selector?: string): HTMLAnchorElement | null;
/**
 * Get the anchor associated with a click event.
 *
 * @param {MouseEvent} event Click event
 * @returns {HTMLAnchorElement|null}
 */
export function getClickedLink(event: MouseEvent): HTMLAnchorElement | null;
/**
 * Check whether a click will navigate the current browsing context.
 *
 * @param {MouseEvent} event Click event
 * @param {HTMLAnchorElement} linkElm Clicked link
 * @returns {boolean}
 */
export function isCurrentContextNavigation(event: MouseEvent, linkElm: HTMLAnchorElement): boolean;
/**
 * Create a stable description of the clicked sidebar link so it can be found
 * again after the sidebar has been rendered.
 *
 * @param {HTMLAnchorElement} linkElm Clicked link
 * @returns {SidebarNavigationTarget|undefined}
 */
export function getSidebarNavigationTarget(linkElm: HTMLAnchorElement): SidebarNavigationTarget | undefined;
/**
 * @param {string} query
 * @return {Record<string, string>}
 */
export function parseQuery(query: string): Record<string, string>;
export function stringifyQuery(obj: any, ignores?: any[]): string;
export function stripUrlExceptId(str: any): any;
export function getPath(...args: any[]): any;
export const isAbsolutePath: (str: any) => any;
export const removeParams: (str: any) => any;
export const getParentPath: (str: any) => any;
export const cleanPath: (str: any) => any;
export const resolvePath: (str: any) => any;
export const replaceSlug: (str: any) => any;
export type SidebarNavigationTarget = {
    className: "app-name-link" | "page-link" | "section-link";
    href: string;
};
//# sourceMappingURL=util.d.ts.map