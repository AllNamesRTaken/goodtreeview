type TemplateFunction<T> = (template: TemplateStringsArray, ...values: any[]) => T;

interface Tag<T> extends TemplateFunction<any> {
  for: (object: object, id?: string) => Tag<T>;
}

declare namespace lighterhtml {
  export const html: Tag<HTMLElement>;
  export const svg: Tag<SVGElement>;
  export function render(node: HTMLElement, renderer: () => any): any;
  export function hook(hook: Function) : {
    html: Tag<HTMLElement>
    svg: Tag<SVGElement>
  };
}