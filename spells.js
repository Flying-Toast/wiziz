module.exports = { //spell entities
  fireSpell: {
    name: 'fireSpell',
    speed: 1,
    range: 700,
    radius: 10,
    type: 'projectile',
    effect: function(affectedPlayer) {
      affectedPlayer.health -= 100;
    }
  },
  freezeSpell: {
    name: 'freezeSpell',
    speed: 0.7,
    range: 500,
    radius: 10,
    effectWearOff: 3000,
    type: 'projectile',
    effect: function(affectedPlayer) {
      if (affectedPlayer.movementSpeed !== 0) {
        affectedPlayer.movementSpeed = 0;
        setTimeout(function() {
          affectedPlayer.movementSpeed = config.playerSpeed;
        }, this.effectWearOff);
      }
    }
  },
  blindSpell: {
    name: 'blindSpell',
    speed: 0.7,
    range: 700,
    type: 'splash',
    explosionRadius: 140,
    ttl: 4000,
    radius: 10,
    effectWearOff: 2000,
    playerCoolDown: 100, //delay between repetitions of effectArea affecting a certain player
    effect: function(affectedPlayer) { //effect of explosion area
      if (!affectedPlayer.blinded) {
        affectedPlayer.blinded = true;
        setTimeout(function() {
          affectedPlayer.blinded = false;
        }, this.effectWearOff);
      }
    },
    color: 'rgba(0, 0, 0, 0.6)'
  }
};