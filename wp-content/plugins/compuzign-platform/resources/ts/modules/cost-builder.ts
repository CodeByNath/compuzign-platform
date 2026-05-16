import '../css/modules/cost-builder.css';

declare global {
  interface Window {
    CompuZign?: any;
  }
}

export interface CostBuilderApp {
  loaded: boolean;
  services: string[];
  init: () => void;
}

const costBuilder: CostBuilderApp = {
  loaded: true,
  services: [],
  init() {
    console.log('CompuZign Cost Builder module initialized');
  }
};

const app: any = window.CompuZign || {};
window.CompuZign = {
  ...app,
  CostBuilder: costBuilder
};

window.CompuZign.CostBuilder?.init?.();

export default costBuilder;
