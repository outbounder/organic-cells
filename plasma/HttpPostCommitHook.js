var Organel = require("organic").Organel;

module.exports = Organel.extend(function HttpPostCommitHook(plasma, config){
  Organel.call(this, plasma, config);
  
  this.config = config || {};
  this.config.postCommitUrl = this.config.postCommitUrl || "/post-commit";
  
  var self = this;
  this.on("HttpPostCommitHook", function(c, sender, callback){
    this[c.action](c, sender, callback);
  });

  this.on("HttpServer", function(c){
    if(this.config.log)
      console.log("post-commit-hook", this.config.postCommitUrl);

    c.data.app.post(this.config.postCommitUrl, function(req, res, next){
      self.processPostCommit({req: req}, self);
      res.send({success: true});
    });
    
    return false;
  })
}, {
  "processPostCommit": function(c, sender, callback) {
    this.emit({type: "Self", action: "upgrade"}, callback);
  }
});