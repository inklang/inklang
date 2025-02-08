type InkHeaders = Headers;
export type { InkHeaders as Headers };

export function createHeaders (): InkHeaders {
  return new Headers();
}

export function appendHeader (headers: InkHeaders, key: string, value: string): void {
  headers.append(key, value);
}
