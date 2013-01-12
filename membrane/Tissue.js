var child_process = require("child_process");
var Organel = require("organic").Organel;

module.exports = Organel.extend(function Tissue(plasma, config){
  Organel.call(this, plasma, config);
  if(config.cwd)
    for(var key in config.cwd)
      config[key] = process.cwd()+config.cwd[key];
  this.config = config;
  
  this.cells = [];
  this.cellsOutput = "";

  this.on(config.reactiveTo || "Tissue", function(c, sender, callback){
    this[c.action](c,sender,callback);
  });
},{
  spawn: function(chemical, sender, callback){
    var config = this.config;
    var cellPath = (chemical.target || config.target);
    if(!cellPath)
      cellPath = process.env[1];
    var target = (chemical.root || config.root || "")+cellPath;
    var childCell;
    childCell = child_process.fork(target, 
      chemical.argv || config.cellArgv || process.argv.splice(2), 
      chemical.options || config.options || {
        cwd: chemical.cwd || config.cellCwd|| process.cwd(),
        env: chemical.env || config.cellEnv || process.env,
        silent: chemical.silent || true
      }
    );
    chemical.process = chemical.data = childCell;
    if(!chemical.silent && !chemical.captureOutput) {
      childCell.stdout.on('data', this.captureCellOutput(childCell));
      childCell.stderr.on('data', this.captureCellErrorOutput(childCell));
    }
    if(!chemical.silent && !chemical.captureDeath)
      childCell.on('exit', this.captureCellDeath(childCell));
    this.cells.push(childCell);
    if(callback) return callback(chemical);
  },
  kill: function(c, sender, callback){
    c.target.kill();
    for(var i = 0; i<this.cells.length; i++)
      if(this.cells[i] === c.target) {
        this.cells.splice(i, 1);
        if(callback) callback(c);
        return;
      }
  },
  captureCellOutput: function(childCell){
    var self = this;
    return function(data){
      self.cellsOutput += data.toString();
      childCell.output += data.toString();
    }
  },
  captureCellErrorOutput: function(childCell) {
    var self = this;
    return function(data){
      self.cellsOutput += data.toString();
      childCell.output += data.toString();
    }
  },
  captureCellDeath: function(childCell) {
    var self = this;
    return function(code) {
      childCell.exitCode = code;
      self.cellsOutput += "cell "+childCell.pid+" exit "+code;
      for(var i = 0; i<self.cells.length; i++)
        if(self.cells[i] === childCell) {
          self.cells.splice(i, 1);
          if(callback) callback(c);
          return;
        }
    }
  },
  output: function(c, sender, callback){
    c.data = this.cellsOutput;
    if(callback) callback(c);
  }
})