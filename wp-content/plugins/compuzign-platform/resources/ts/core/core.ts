import '../css/core.css';
import { initQuoteBuilder } from '../components/quote-builder/index';

declare global {
  interface Window {
    CompuZign?: any;
  }
}

const app: any = window.CompuZign || {};

const core = {
  loaded: true,
  modules: ['core'],
  init() {
    initQuoteBuilder();
    this.modules.push('core');
    console.log('CompuZign core initialized');
  }
};

window.CompuZign = {
  ...app,
  ...core
};

window.CompuZign.init?.();

export default core;
