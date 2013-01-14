var Organel = require("organic").Organel;
var _ = require("underscore");
var path = require('path');
var shelljs = require("shelljs");
var fs = require('fs');
var async = require('async');

module.exports = Organel.extend(function Self(plasma, config){
  Organel.call(this, plasma, config);
  if(config.cwd)
    for(var key in config.cwd)
      config[key] = process.cwd()+config.cwd[key];
  this.config = config;
  var self = this;

  process.on("SIGUSR1", function(){
    console.log("recieved upgrade signal");
    self.upgrade({});
  });

  process.on("SIGUSR2", function(){
    console.log("recieved restart signal");
    self.restart({});
  });

  this.on("Self", function(c, sender, callback){
    this[c.action](c, sender, callback);
  });

  if(config.siblings)
    self.startSiblings(config, this, function(c){
      self.emit({type: "Self", pid: process.pid, siblings: c.startedSiblings});
    });

}, {
  startSiblings: function(c, sender, callback){
    var self = this;
    this.emit({
      type: "Tissue",
      action: "list",
      target: c.tissue
    }, function(list){
      var siblingsNames = _.pluck(c.siblings,"name");
      var startedNames = _.pluck(list.data, "name");
      var notStartedSiblings = _.difference(siblingsNames, startedNames);
      var startedSiblings = [];
      async.forEach(notStartedSiblings, function(siblingName, next){
        var target = path.join(path.dirname(process.argv[1]), siblingName);
        self.emit({
          type: "Tissue",
          action: "start",
          target: target
        }, function(started){
          if(started instanceof Error) return next(started);
          startedSiblings.push(started.data);
          next();
        });
      }, function(err){
        if(callback) callback(err || {startedSiblings: startedSiblings});
      });
    });
  },
  restart: function(c, sender, callback) {
    this.emit({
      type: "Tissue",
      action: "start",
      target: process.argv[1]
    }, function(start){
      if(callback) callback(start);
      process.exit();
    });
  },
  upgrade: function(c, sender, callback){
    var self = this;
    fs.exists(".git", function(exists){
      if(exists) {
        shelljs.exec("git pull",function(code, output){
          console.log(output);
          if(code == 0)
            shelljs.exec("npm install", function(code, output){
              console.log(output);
              self.restart(c, sender, callback);
            });
        });
      }
    });
  }
})