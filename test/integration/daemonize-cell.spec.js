var fs = require("fs");
var path = require("path");

describe("Tissue", function(){
  var Plasma = require("organic").Plasma;
  var plasma = new Plasma();
  var Tissue = require("../../membrane/Tissue");
  var tissue = new Tissue(plasma, {});
  var daemonCell;

  var spawnOptions = {
    target: path.normalize(__dirname+"/../data/daemonCell.js"),
  }
  var getUserHome = function() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  };
  var mockGetCellMarker = function(bindTo, target, pid) {
    return path.join(getUserHome(),".organic", bindTo, path.basename(target))+"."+pid;
  };

  it("creates cell instance as daemon", function(next){
    tissue.start(spawnOptions, this, function(c){
      daemonCell = c.data;
      setTimeout(function(){
        var pid = mockGetCellMarker("daemons", spawnOptions.target, daemonCell.pid);
        expect(fs.existsSync(pid)).toBe(true);
        next();
      }, 2000);
    })
  });
  it("kills the cell deamon", function(next){
    tissue.stop({target: daemonCell.pid}, this, function(c){
      setTimeout(function(){
        var pid = mockGetCellMarker("daemons", spawnOptions.target, daemonCell.pid);
        expect(fs.existsSync(pid)).toBe(false);
        next();
      }, 2000);
    });
  })
});