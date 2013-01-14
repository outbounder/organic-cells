var child_process = require("child_process");
var Organel = require("organic").Organel;
var fs = require("fs");
var path = require("path");
var shelljs = require("shelljs");
var glob = require("glob");

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

module.exports = Organel.extend(function Tissue(plasma, config){
  Organel.call(this, plasma, config);

  if(config.cwd)
    for(var key in config.cwd)
      config[key] = process.cwd()+config.cwd[key];
  this.config = config;

  this.on(config.captureType || "Tissue", function(c, sender, callback){
    this[c.action](c,sender,callback);
  });

  if(config.bindTo) {
    var self = this;
    process.on("SIGUSR2", function(){
      self.restart();
    });
    process.on("exit", function(){
      if(fs.existsSync(self.getCellMarker()))
        fs.unlinkSync(self.getCellMarker());
    });
    process.on("SIGTERM", function(){
      process.exit(0);
    });
    process.on("SIGINT", function(){
      process.exit(0);
    })
    process.on("uncaughtException", function(err){
      console.log(err);
      console.log(err.stack);
      process.exit(1);
    });
    if(!fs.existsSync(path.join(getUserHome(),".organic",config.bindTo)))
      shelljs.mkdir('-p', path.join(getUserHome(),".organic",config.bindTo));
    fs.writeFileSync(this.getCellMarker(), 
      JSON.stringify({
        source: path.dirname(process.argv[1]),
        cwd: process.cwd()
      }));
  }
},{
  getCellMarker: function(tissue, filename, pid) {
    if(tissue && filename && pid)
      return path.join(getUserHome(),".organic", tissue, filename)+"."+pid;
    return path.join(getUserHome(),".organic", this.config.bindTo, path.basename(process.argv[1]))+"."+process.pid;
  },
  start: function(c, sender, callback){
    if(!c.target) 
      c.target = process.argv[1];
    var argv = c.argv || this.config.argv || [];
    var err = out = (c.cwd || this.config.cellCwd || process.cwd())+"/"+path.basename(c.target);
    out = fs.openSync(out+".out", 'a');
    err = fs.openSync(err+".err", 'a');
    var options = {
      detached: true,
      cwd: c.cwd || this.config.cellCwd|| process.cwd(),
      env: c.env || this.config.cellEnv || process.env,
      silent: true,
      stdio: [ 'ignore', out, err ]
    }
    var childCell = child_process.spawn(process.argv[0], [c.target].concat(argv), options);
    childCell.unref();
    c.data = childCell;
    if(callback) callback(c);
  },
  stop: function(c, sender, callback){
    process.kill(-c.target); // not sure is it working on win
    if(callback) callback(c);
  },
  restart: function(c, sender, callback) {
    this.start({}, sender, function(start){
      if(callback) callback(start);
      process.exit();
    });
  },
  list: function(c, sender, callback){
    var root = path.join(getUserHome(),"/.organic");
    var organicDir = path.join(root, c.target);
    glob(organicDir+"/**/*.*", function(err, files){
      var entries = [];
      files.forEach(function(file){
        var entry = {
          name: path.basename(file, path.extname(file)),
          tissue: path.dirname(file).replace(root+"/", ""),
          pid: file.split(".").pop()
        };
        if(entry.pid == process.pid)
          entry.self = true;
        entries.push(entry);
      });
      c.data = entries;
      if(callback) callback(c);
    });
  }
})