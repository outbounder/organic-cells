describe("Tissue", function(){
  var Tissue = require("../../membrane/Tissue");
  var Plasma = require("organic").Plasma;
  var tissue;
  var childCell;
  var plasma = new Plasma();
  var config = {
  }
  it("creates instance", function(){
    tissue = new Tissue(plasma, config);
  });

  it("spawns new cell from path", function(next){
    plasma.emit({type: "Tissue", action: "spawn", target: __dirname+"/../data/cell.js"}, this, function(c){
      expect(c instanceof Error).toBe(false);
      childCell = c.data;
      next();
    });
  });

  it("kills the new cell", function(next){
    setTimeout(function(){
      plasma.emit({type: "Tissue", action: "kill", target: childCell}, this, function(c){
        expect(c instanceof Error).toBe(false);
        next();
      });  
    }, 2000);
  });

  it("prints all the output properly even for the death cells", function(next){
    setTimeout(function(){
      plasma.emit({type: "Tissue", action: "output"}, this, function(c){
        expect(c instanceof Error).toBe(false);
        expect(c.data).toContain("HttpServer");
        expect(c.data).toContain("exit");
        next();
      })
    }, 1000);
  })
});