/* eslint-disable @typescript-eslint/no-explicit-any */

declare module "d3-flame-graph" {
  export function flamegraph(): {
    width: (w: number) => any;
    height: (h: number) => any;
    cellHeight: (h: number) => any;
    transitionDuration: (d: number) => any;
    minFrameSize: (s: number) => any;
    transitionEase: (ease: any) => any;
    sort: (s: boolean) => any;
    title: (t: string) => any;
    inverted: (i: boolean) => any;
    color: (fn: (d: any) => string) => any;
    tooltip: (t: any) => any;
    setLabelHandler: (fn: (d: any) => string) => any;
    setDetailsElement: (el: any) => any;
    selfValue: (v: boolean) => any;
    [key: string]: any;
  };
}
