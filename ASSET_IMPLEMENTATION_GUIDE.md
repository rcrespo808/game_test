# Asset Implementation Guide

## Code Structure Prepared

The game code has been prepared for asset implementation with the following changes:

### 1. Phaser Config Updated
- **Arcade Physics enabled** in game config
- Physics debug mode available (set `debug: true` for development)

### 2. Preload Method
- Sprite sheet loading for all 6 assets
- Fallback texture generation (if assets not found)

### 3. Animation System
- `createAnimations()` method added
- All 6 animations defined with correct frame rates

### 4. Methods Ready for Asset Integration

#### `spawnHazard()` - Needs Update
**Current**: Uses fallback `hazard_texture`  
**Ready for**: Random selection from 3 hazard types with animations

**Implementation Pattern**:
```javascript
// Select random hazard type
const hazardTypes = ['hazard_triangle', 'hazard_square', 'hazard_diamond'];
const animKeys = ['triangle_spin', 'square_rotate', 'diamond_cut'];
const typeIndex = Phaser.Math.Between(0, 2);
const textureKey = hazardTypes[typeIndex];
const animKey = animKeys[typeIndex];

// Create sprite with animation
const hazard = this.add.sprite(spawnX, y, textureKey);
hazard.play(animKey);
```

#### `spawnRedHotspot()` - Needs Update
**Current**: Uses simple circle  
**Ready for**: Falling animation → Burst effect → Flame sprite with physics

**Implementation Pattern**:
```javascript
// 1. Create falling sprite (starts above screen)
const fallSprite = this.add.sprite(pos.x, -100, 'redhotspot_fall');
fallSprite.setDepth(15);
fallSprite.play('redhotspot_fall');

// 2. Tween to final position
this.tweens.add({
    targets: fallSprite,
    y: pos.y,
    duration: 1200,
    onComplete: () => {
        // 3. Play burst animation
        const burst = this.physics.add.sprite(pos.x, pos.y, 'burst_explosion');
        burst.setDepth(16);
        burst.body.setCircle(32);
        burst.body.setImmovable(true);
        burst.play('burst_explode');
        
        // 4. Replace with flame sprite
        fallSprite.destroy();
        const flame = this.physics.add.sprite(pos.x, pos.y, 'flame');
        flame.setDepth(15);
        flame.body.setCircle(24);
        flame.body.setImmovable(true);
        flame.play('flame_flicker');
        
        hotspot.flameSprite = flame;
        hotspot.active = true;
    }
});
```

### 5. Collision Detection Updates Needed

#### For Flame Sprites (Arcade Physics)
```javascript
// In update() or separate collision check
this.physics.world.overlap(this.player, flameSprites, (player, flame) => {
    this.handlePlayerHit();
});
```

#### For Burst Sprites (Arcade Physics)
```javascript
// Check collision during burst animation
this.physics.world.overlap(this.player, burstSprites, (player, burst) => {
    this.handlePlayerHit();
});
```

---

## Asset Loading Order

1. **Preload Phase**: All sprite sheets load
2. **Create Phase**: Animations created
3. **Gameplay Phase**: Assets used with fallbacks

---

## Fallback Behavior

If assets fail to load:
- Flying hazards use generated `hazard_texture`
- Red hotspots use simple circle (current behavior)
- Effects are skipped (no burst/flame)

---

## Testing Checklist

- [ ] All 6 sprite sheets load correctly
- [ ] Animations play at correct speeds
- [ ] 3 hazard types spawn randomly
- [ ] Red hotspot falls from top
- [ ] Burst effect plays on landing
- [ ] Flame sprite appears after burst
- [ ] Physics collisions work (flame/burst)
- [ ] Player dies on flame collision
- [ ] Assets clean up properly on game end

---

## Next Steps

1. Create/obtain sprite sheet assets (see ASSET_LIST.md)
2. Place assets in `assets/` directory structure
3. Update `spawnHazard()` to use sprite sheets
4. Update `spawnRedHotspot()` to use falling animation
5. Add burst and flame sprite creation
6. Implement Arcade Physics collision detection
7. Test and refine animations

