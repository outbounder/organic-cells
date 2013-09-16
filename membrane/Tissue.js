var child_process = require("child_process");
var Organel = require("organic").Organel;
var fs = require("fs");
var path = require("path");
var shelljs = require("shelljs");
var glob = require("glob");
var async = require('async');

/* organel | Tissue

Once constructed with `bindTo` value, the organelle will leave a Tissue marker on specific place.
Any Cells with the same `bindTo` value will then be able to self-resolve as part of the same tissue and 
thereafter to be able to recognize existence of cells from the same system.

* `cwd`: Object

  * optional * , Object containing key:value pairs, where all values will be prefixed with `process.cwd()` and set with their coressponding keys directly to the DNA of the organelle.


* `captureType` : "Tissue"

  the type of the chemical which the organelle will listen to. Defaults to `"Tissue"`

* `bindTo` : String

  when value is provided, the Tissue organelle will write a `cell marker` file at `%USER_HOME%/.organic/bindToValue/entrypoint.pid` which is used to identify running or improperly stopped cells.

  this represent the name of the tissue to which the cell should be grouped.

* `argv` : [ String ]

  *optional*, represents the default arguments to be used when starting something via the Tissue

* `cellCwd` : String

  *optional*, represents the default current working directory for the process started via the Tissue

* `cellEnv` : Object

  *optional*, represents the default process environment once started via the Tissue*/

/* incoming | Tissue 

* `action` : String

  **required**, can have one of the following values and their corresponding options:

    * **start**

      Starts a Cell as daemon background process. It depends to the Cell for self registration using Tissue markers.

      * `target` : String

        path to nodejs app entry point

      * `exec` : String

        if `target` is not provided, giving value to `exec` will start a shell process parsing any commandline operations provided in its value.
      
      * `output` : true

        instructs piping all stdout & stderr outputs of the process to file next to the app entry point.

      * `argv` : [ String ]

        *optional*, represents the default arguments to be used when starting something via the Tissue

      * `cwd` : String

        *optional*, represents the default current working directory for the process started via the Tissue

      * `cellEnv` : Object

        *optional*, represents the default process environment once started via the Tissue

      This action returns emitted Chemical callback with data value equal to the spawned child process in detached state.
    
    * **stop**

      Stops single process running.

      * `target` : String

        pid of process

    * **stopall**

      Stops all cells by given target

      * `target` : String
        
        nodejs entry name or tissue name

    * **restartall**
   
      Sends `SIGUSR2` process signal to all Cells by given target who registered themselfs via Tissue markers 
 
      * `target` : String

        nodejs entry name or tissue name

    * **upgradeall**

      Sends `SIGUSR1` process signal to all Cells by given target who registered themselfs via Tissue markers

      * `target` : String
      
        nodejs entry name or tissue name

    * **list**

      Searches in organic directory appending optionally given target as tissue name, for containing files and returns them as json array with structure

          {
            name: String, basename of Cell's entry point
            tissue: String, dirname of Cell's marker
            pid: String, process id of Cell's instance
          }

      * `target` : String
        
        *optional* tissue name

    * **cleanup**

      Lists all found markers and checks for existence of process with the recorded pid. In case it is not found - the marker file is deleted. Returns json list with deleted markers.

* `target` : String

   Depends on `action` value.

*/

/* incoming | surviveExceptions 

Tissue organelle listens for such chemical in order to unbind global exceptions trapping. This prevents the organelle from removing the tissue marker upon destroying the cell itself. Thereafter the organelle removes the marker only once `kill` chemical is received.

such chemicals are accepted only when `bindTo` value is provided*/
/* incoming | kill 

Upon receiving such chemical the organelle removes the tissue marker*/

var getUserHome = function () {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

var checkPid = function(pid, callback) {
  if(process.platform.indexOf("win") === 0) {
    throw new Error("Windows not supported yet");
  } else {
    child_process.exec("ps -p "+pid, function(err, stdout, stderr){
      callback(null, stdout.toString().indexOf(pid) !== -1);
    });
  }
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
    process.on("exit", function(){
      if(fs.existsSync(self.getCellMarker()))
        fs.unlinkSync(self.getCellMarker());
    })
    process.on("SIGTERM", function(){
      if(fs.existsSync(self.getCellMarker()))
        fs.unlinkSync(self.getCellMarker());
      process.exit(0);
    })
    process.on("SIGINT", function(){
      if(fs.existsSync(self.getCellMarker()))
        fs.unlinkSync(self.getCellMarker());
      process.exit(0);
    });
    var exceptionWrapper = function(err){
      if(fs.existsSync(self.getCellMarker()))
        fs.unlinkSync(self.getCellMarker());
      process.exit(1);
    }
    process.on("uncaughtException", exceptionWrapper);
    this.on("surviveExceptions", function(){
      process.removeListener("uncaughtException", exceptionWrapper)
      return false;
    });
    this.on("kill", function(){
      if(fs.existsSync(self.getCellMarker()))
        fs.unlinkSync(self.getCellMarker());
      return false;
    })

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
    var argv = c.argv || this.config.argv || [];
    
    var stdio = [];
    if(c.target && c.output !== false)  {
      var err = out = (c.output || c.cwd || this.config.cellCwd || process.cwd())+"/"+path.basename(c.target);
      out = fs.openSync(out+".out", 'a');
      err = fs.openSync(err+".err", 'a');
      stdio = ['ignore', out, err];
    }

    var options = {
      detached: true,
      cwd: c.cwd || this.config.cellCwd|| process.cwd(),
      env: c.env || this.config.cellEnv || process.env,
      silent: true,
      stdio: stdio
    }

    var childCell;
    if(c.target)
      childCell = child_process.spawn(process.argv[0], [c.target].concat(argv), options);
    else
    if(c.exec)
      childCell = child_process.exec(c.exec, options);
    else {
      if(callback) callback(new Error("target or exec missing"));
      return;
    }

    childCell.unref();

    c.data = childCell;
    if(callback) callback(c);
  },
  stop: function(c, sender, callback){
    process.kill(c.target);
    if(callback) callback(c);
  },
  stopall: function(c, sender, callback){
    this.list({}, this, function(r){
      var stopped = [];
      r.data.forEach(function(entry){
        if(entry.name == c.target || entry.tissue == c.target) {
          process.kill(entry.pid);
          stopped.push(entry);
        }
      });
      if(callback) callback({data: stopped});
    })
  },
  restartall: function(c, sender, callback){
    this.list({}, this, function(r){
      var restarted = [];
      r.data.forEach(function(entry){
        if(entry.name == c.target || entry.tissue == c.target) {
          process.kill(entry.pid, "SIGUSR2");
          restarted.push(entry);
        }
      });
      if(callback) callback({data: restarted});
    })
  },
  upgradeall: function(c, sender, callback){
    this.list({}, this, function(r){
      var upgraded = [];
      r.data.forEach(function(entry){
        if(entry.name == c.target || entry.tissue == c.target) {
          process.kill(entry.pid, "SIGUSR1");
          upgraded.push(entry);
        }
      });
      if(callback) callback({data: upgraded});
    });
  },
  list: function(c, sender, callback){
    var root = path.join(getUserHome(),"/.organic");
    var organicDir = path.join(root, c.target || "");
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
  },
  cleanup: function(c, sender, callback) {
    var self = this;
    this.list(c, sender, function(r){
      var stopped = [];
      async.forEach(r.data, function(entry, next){
        checkPid(entry.pid, function(err, running){
          if(err) return next(err);
          if(!running) {
            fs.unlink(self.getCellMarker(entry.tissue,entry.name, entry.pid), function(err){
              next(err);
            })
            stopped.push(entry);
          } else
            next();
        })
      }, function(err){
        if(err) return callback(err);
        c.data = stopped;
        callback(c);
      })
    })
  }
})