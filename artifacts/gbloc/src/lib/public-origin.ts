export function publicOrigin() {
  return document.querySelector<HTMLMetaElement>('meta[name="gbloc-public-origin"]')?.content
    || window.location.origin;
}

export function publicProfileUrl(username: string) {
  return new URL(`/@${encodeURIComponent(username.toLowerCase())}`, publicOrigin()).href;
}
