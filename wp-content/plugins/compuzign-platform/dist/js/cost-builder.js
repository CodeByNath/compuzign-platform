(function () {
  var app = window.CompuZign || {};
  var costBuilder = {
    loaded: true,
    services: [],
    init: function () {
      console.log('CompuZign Cost Builder module initialized');
    }
  };
  window.CompuZign = Object.assign({}, app, {
    CostBuilder: costBuilder
  });
  if (window.CompuZign.CostBuilder && typeof window.CompuZign.CostBuilder.init === 'function') {
    window.CompuZign.CostBuilder.init();
  }
})();
