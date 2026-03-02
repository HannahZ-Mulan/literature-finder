declare module 'citation-js' {
  import { Plugin } from '@citation-js/core';

  interface CiteStatics {
    plugins: {
      add(plugin: Plugin): void;
    };
    new(data: any): CiteInstance;
    static(): CiteInstance;
  }

  interface CiteInstance {
    format(format: string, options?: any): string;
    get(options?: any): any;
    data: any[];
  }

  const Cite: CiteStatics;
  export default Cite;
}

declare module '@citation-js/plugin-csl' {
  import { Plugin } from '@citation-js/core';

  const pluginCsl: Plugin;
  export default pluginCsl;
}
