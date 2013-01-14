var Organel = require("organic").Organel;
var _ = require("underscore");
var path = require('path');

module.exports = Organel.extend(function Self(plasma, config){
  Organel.call(this, plasma, config);
  if(config.cwd)
    for(var key in config.cwd)
      config[key] = process.cwd()+config.cwd[key];
  this.config = config;

  var self = this;

  process.on("SIGUSR2", function(){
    self.restart({});
  });

  this.on("Self", function(c, sender, callback){
    this[c.action](c, sender, callback);
  });

  if(config.siblings) {
    this.emit({
      type: "Tissue",
      action: "list",
      target: config.tissue
    }, function(list){
      var notStartedSiblings = _.difference(_.pluck(config.siblings,"name"), _.pluck(list.data, "name"));
      notStartedSiblings.forEach(function(siblingName){
        var target = path.join(config.base || process.cwd(), siblingName);
        self.emit({
          type: "Tissue",
          action: "start",
          target: target
        });
      });
    });
  }

}, {
  restart: function(c, sender, callback) {
    this.emit({
      type: "Tissue",
      action: "start",
      target: process.argv[1]
    }, function(start){
      if(callback) callback(start);
      process.exit();
    });
  }
})