(function () {
  var app = window.CompuZign || {};
  var core = {
    loaded: true,
    modules: ['core'],
    init: function () {
      this.modules.push('core');
      console.log('CompuZign core initialized');
    }
  };
  window.CompuZign = Object.assign({}, app, core);
  if (window.CompuZign.init) {
    window.CompuZign.init();
  }
})();
