var Organel = require("organic").Organel;
var _ = require("underscore");
var path = require('path');
var shelljs = require("shelljs");
var fs = require('fs');
var async = require('async');

/* organel | 

Organelle responsible for managing 'self' of the Cell namely to self-restart, self-upgrade, self-prevent from crashing on exceptions, self-starting any sibling cells.

This organelle uses Tissue organelle configured with `bindTo` to self-daemonize.

* `upgradeCommand` : "git pull; npm install"

  command to be executed as shell process upon receiving process signal "SIGUSR1".

* `surviveExceptions` : false
  
  when set to `true` , it will prevent the Cell from exiting upon uncaught exceptions. No logging will be added, and if Tissue organelle is attached it will be instructed via "surviveExceptions" chemical to prevent process exit too.

* `siblings` : [ Sibling Object ]
  
  starts as background process any sibling cells not returned via Tissue list

  ### Sibling Object ###

      {
        cwd: String // current working directory, defaults to dirname of current nodejs process
        name: String // filename of Cell's entry point
        output: Boolean // defaults to undefined, instructs omitting Cell's output logging
      }

* `tissue` : String
  required to list siblings for starting*/
/* incoming | Self 

* `action` : String

  * `startSiblings`

     will start any configured siblings which are not found running.

  * `restart` 

     will emit Tissue start chemical and thereafter will exit the process.

  * `upgrade`

    will emit Tissue start chemical with configured upgradeCommand and thereafter will self-restart only if upgradeCommand exits with code == 0


  * `registerAsService` 

     Experimental using `servicer` module. Still doesn't works.

  * `unregisterAsService` 

     Experimental using `servicer` module. Still doesn't works.*/
/* outgoing | surviveExceptions 

Emitted upon construction, depends on DNA.*/
/* outgoing | Self 

Emitted only after all siblings are checked and those who are not running has been fired up via Tissue organelle.

* pid : process.pid
* siblings : [ Started ChildProcess ]*/
/* outgoing | Tissue List 

Emitted Chemical is "Tissue" with structure:

* type: "Tissue"
* action: "list"
* target: String

  has the value of configured `tissue` */
/* outgoing | Tissue Start 

Emitted Chemical is "Tissue" with structure:

* type: "Tissue"
* action: "start"
* target: String

  has the value taken from sibling's path resolving.*/

module.exports = Organel.extend(function Self(plasma, config){
  Organel.call(this, plasma, config);
  if(config.cwd)
    for(var key in config.cwd)
      config[key] = process.cwd()+config.cwd[key];
  this.config = config;
  var self = this;
  self.config.upgradeCommand = self.config.upgradeCommand || "git pull; npm install";

  process.on("SIGUSR1", function(){
    console.log("recieved upgrade signal");
    self.upgrade({});
  });

  process.on("SIGUSR2", function(){
    console.log("recieved restart signal");
    self.restart({});
  });

  if(config.surviveExceptions) {
    this.emit("surviveExceptions");
    process.on("uncaughtException", function(err){
      // do nothing here
    });
  }
  
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
      target: c.tissue || this.config.tissue
    }, function(list){
      var siblingsNames = _.pluck(c.siblings,"name");
      var startedNames = _.pluck(list.data, "name");
      var notStartedSiblings = _.difference(siblingsNames, startedNames);
      var startedSiblings = [];
      async.forEach(notStartedSiblings, function(siblingName, next){
        var sibling = _.find(c.siblings, function(s){ return s.name == siblingName });
        var target = siblingName;
        if(!sibling.cwd)
          target = path.join(path.dirname(process.argv[1]), siblingName);
        self.emit({
          type: "Tissue",
          action: "start",
          target: target,
          cwd: sibling.cwd?path.join(path.dirname(process.argv[1]), sibling.cwd):false,
          output: sibling.output
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
      var exit = true;
      if(callback) exit = callback(start);
      if(exit)
        process.exit();
    });
  },
  upgrade: function(c, sender, callback){
    var self = this;
    fs.exists(".git", function(exists){
      if(exists) {
        self.emit({
          type: "Tissue",
          action: "start",
          exec: self.config.upgradeCommand,
        }, function(r){
          if(r instanceof Error) {
            if(callback) callback(r);
            return;
          }
          r.data.on("exit", function(code){
            if(code == 0)
              self.restart(c, sender, callback);
            else
              if(callback)
                callback(new Error(self.config.upgradeCommand+" failed with code "+code));
              else
                console.log(self.config.upgradeCommand+" failed with code "+code);
          });
        });
      }
    });
  },
  registerAsService: function(c, sender, callback){
    var self = this;
    require("servicer").init(function(services){
      services.install(self.config.name, process.cwd, process.argv[1], function(err){
        callback(err);
      });
    })
  },
  unregisterAsService: function(c, sender, callback) {
    var self = this;
    require("servicer").init(function(services){
      services.uninstall(self.config.name, function(err){
        callback(err);
      });
    })
  }
})