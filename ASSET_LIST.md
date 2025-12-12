# Asset List - 3x3 Grid Runner

## Overview
This document specifies all sprite sheet assets required for the game, including dimensions, frame counts, and usage.

---

## 1. Flying Hazards (3 Types)

### Hazard Type 1: Triangle Spinner
- **File**: `hazard_triangle.png`
- **Sprite Sheet Dimensions**: 160x40px (4 frames × 40x40px)
- **Frame Size**: 40x40px per frame
- **Frame Count**: 4 frames (rotation animation)
- **Animation Speed**: 150ms per frame
- **Usage**: Horizontal flying hazards (left/right movement)
- **Hitbox**: None (uses manual distance check)
- **Color Scheme**: Red (#ff4444) with rotation effect

### Hazard Type 2: Square Rotator
- **File**: `hazard_square.png`
- **Sprite Sheet Dimensions**: 160x40px (4 frames × 40x40px)
- **Frame Size**: 40x40px per frame
- **Frame Count**: 4 frames (rotation animation)
- **Animation Speed**: 120ms per frame
- **Usage**: Horizontal flying hazards (left/right movement)
- **Hitbox**: None (uses manual distance check)
- **Color Scheme**: Orange (#ff8844) with rotation effect

### Hazard Type 3: Diamond Cutter
- **File**: `hazard_diamond.png`
- **Sprite Sheet Dimensions**: 160x40px (4 frames × 40x40px)
- **Frame Size**: 40x40px per frame
- **Frame Count**: 4 frames (rotation animation)
- **Animation Speed**: 100ms per frame
- **Usage**: Horizontal flying hazards (left/right movement)
- **Hitbox**: None (uses manual distance check)
- **Color Scheme**: Dark Red (#cc2222) with rotation effect

**Note**: All flying hazards use the same sprite sheet layout (horizontal strip, 4 frames).

---

## 2. Red Hotspot - Falling Animation

### Red Hotspot Fall
- **File**: `redhotspot_fall.png`
- **Sprite Sheet Dimensions**: 192x48px (4 frames × 48x48px)
- **Frame Size**: 48x48px per frame
- **Frame Count**: 4 frames (falling animation)
- **Animation Speed**: 300ms per frame (1200ms total for activation)
- **Usage**: Red hotspot warning stage (falling from top to grid position)
- **Hitbox**: None during fall (only active after landing)
- **Color Scheme**: Red (#ff0000) with glow effect
- **Animation Direction**: Vertical (top to bottom)

**Animation Sequence**:
1. Frame 0: Start position (top, small)
2. Frame 1: Mid-fall (medium size)
3. Frame 2: Near landing (larger)
4. Frame 3: Landed position (final size, ready to activate)

---

## 3. Burst/Blast Effect

### Explosion Burst
- **File**: `burst_explosion.png`
- **Sprite Sheet Dimensions**: 256x64px (4 frames × 64x64px)
- **Frame Size**: 64x64px per frame
- **Frame Count**: 4 frames (explosion animation)
- **Animation Speed**: 80ms per frame (320ms total)
- **Usage**: Visual effect when red hotspot activates (becomes deadly)
- **Hitbox**: **YES** - Arcade Physics body (64x64px circle)
- **Color Scheme**: Yellow/Orange gradient (#ffaa00 → #ff4400)
- **Lifetime**: Single play, auto-destroy after animation

**Animation Sequence**:
1. Frame 0: Small burst (16px radius)
2. Frame 1: Expanding (32px radius)
3. Frame 2: Peak explosion (48px radius)
4. Frame 3: Fading out (64px radius, low alpha)

---

## 4. Flame Effect

### Flame Asset
- **File**: `flame.png`
- **Sprite Sheet Dimensions**: 192x48px (4 frames × 48x48px)
- **Frame Size**: 48x48px per frame
- **Frame Count**: 4 frames (flame flicker animation)
- **Animation Speed**: 100ms per frame (400ms per cycle, loops)
- **Usage**: Active red hotspot visual (after landing, when deadly)
- **Hitbox**: **YES** - Arcade Physics body (48x48px circle)
- **Color Scheme**: Red/Orange gradient (#ff0000 → #ff8800)
- **Lifetime**: Loops while hotspot is active (until expiration or player death)

**Animation Sequence**:
1. Frame 0: Small flame
2. Frame 1: Medium flame
3. Frame 2: Large flame
4. Frame 3: Medium flame (back to frame 1 for loop)

---

## Asset Summary Table

| Asset Name | File | Dimensions | Frames | Frame Size | Has Hitbox | Usage |
|------------|------|------------|--------|------------|------------|-------|
| Triangle Spinner | `hazard_triangle.png` | 160×40px | 4 | 40×40px | No | Flying hazard type 1 |
| Square Rotator | `hazard_square.png` | 160×40px | 4 | 40×40px | No | Flying hazard type 2 |
| Diamond Cutter | `hazard_diamond.png` | 160×40px | 4 | 40×40px | No | Flying hazard type 3 |
| Red Hotspot Fall | `redhotspot_fall.png` | 192×48px | 4 | 48×48px | No | Red hotspot falling animation |
| Explosion Burst | `burst_explosion.png` | 256×64px | 4 | 64×64px | **Yes** | Red hotspot activation effect |
| Flame | `flame.png` | 192×48px | 4 | 48×48px | **Yes** | Active red hotspot visual |

---

## File Structure

```
assets/
├── hazards/
│   ├── hazard_triangle.png
│   ├── hazard_square.png
│   └── hazard_diamond.png
├── hotspots/
│   └── redhotspot_fall.png
└── effects/
    ├── burst_explosion.png
    └── flame.png
```

---

## Implementation Notes

### Sprite Sheet Loading
All assets will be loaded using Phaser's `this.load.spritesheet()` method:
```javascript
this.load.spritesheet('hazard_triangle', 'assets/hazards/hazard_triangle.png', {
    frameWidth: 40,
    frameHeight: 40
});
```

### Animation Creation
Animations will be created using `this.anims.create()`:
```javascript
this.anims.create({
    key: 'triangle_spin',
    frames: this.anims.generateFrameNumbers('hazard_triangle', { start: 0, end: 3 }),
    frameRate: 6.67, // ~150ms per frame
    repeat: -1
});
```

### Arcade Physics Setup
Only `burst_explosion` and `flame` will have Arcade Physics bodies:
```javascript
// For burst and flame sprites
this.physics.add.sprite(x, y, 'sprite_key');
sprite.body.setCircle(radius);
sprite.body.setImmovable(true);
```

### Hitbox Specifications
- **Burst**: 64x64px circle (32px radius)
- **Flame**: 48x48px circle (24px radius)

---

## Color Palette Reference

- **Hazard Triangle**: #ff4444 (Red)
- **Hazard Square**: #ff8844 (Orange)
- **Hazard Diamond**: #cc2222 (Dark Red)
- **Red Hotspot**: #ff0000 (Pure Red)
- **Burst Start**: #ffaa00 (Yellow-Orange)
- **Burst End**: #ff4400 (Orange-Red)
- **Flame Base**: #ff0000 (Red)
- **Flame Tip**: #ff8800 (Orange)

---

## Performance Considerations

- All sprite sheets use power-of-2 dimensions where possible
- Frame counts kept low (4 frames max) for performance
- Only 2 assets use physics (burst and flame) to minimize overhead
- Flying hazards use manual collision (no physics) for better performance

