/**
 * Sprite Animation Utilities
 * Handles sprite sheet loading and animation creation
 */

/**
 * Extract frames from a sprite sheet and add them as named frames to the texture
 * @param {Phaser.Scene} scene - Phaser scene
 * @param {string} textureKey - Key of the loaded sprite sheet texture
 * @param {number} startX - Starting X coordinate in pixels
 * @param {number} startY - Starting Y coordinate in pixels
 * @param {number} frameWidth - Width of each frame in pixels
 * @param {number} frameHeight - Height of each frame in pixels
 * @param {number} frameCount - Number of frames to extract
 * @param {number} spacingX - Horizontal spacing between frames (default: 0)
 * @returns {Array<string>} Array of frame names
 */
export function extractSpriteFrames(scene, textureKey, startX, startY, frameWidth, frameHeight, frameCount, spacingX = 0) {
    const texture = scene.textures.get(textureKey);
    const frameNames = [];
    
    for (let i = 0; i < frameCount; i++) {
        const frameName = `${textureKey}_frame_${i}`;
        const x = startX + i * (frameWidth + spacingX);
        const y = startY;
        
        // Add frame to texture using add method
        // Phaser 3: texture.add(name, sourceIndex, x, y, width, height)
        // sourceIndex 0 means use the texture itself as source
        texture.add(frameName, 0, x, y, frameWidth, frameHeight);
        frameNames.push(frameName);
    }
    
    return frameNames;
}

/**
 * Create frame configurations from frame names for animations
 * @param {string} textureKey - Key of the texture
 * @param {Array<string>} frameNames - Array of frame names
 * @returns {Array<Object>} Array of frame configuration objects
 */
export function createFrameConfigs(textureKey, frameNames) {
    return frameNames.map(frameName => ({ key: textureKey, frame: frameName }));
}

/**
 * Create a Phaser animation from frame configurations
 * @param {Phaser.Scene} scene - Phaser scene
 * @param {string} animKey - Unique key for the animation
 * @param {Array<Object>} frameConfigs - Array of frame configuration objects
 * @param {number} frameRate - Animation frame rate (frames per second)
 * @param {boolean} repeat - Whether to repeat the animation (default: true)
 */
export function createAnimation(scene, animKey, frameConfigs, frameRate = 10, repeat = true) {
    if (scene.anims.exists(animKey)) {
        console.warn(`Animation '${animKey}' already exists, skipping creation`);
        return;
    }
    
    scene.anims.create({
        key: animKey,
        frames: frameConfigs,
        frameRate: frameRate,
        repeat: repeat ? -1 : 0
    });
}

/**
 * Setup hazard sprite animations
 * @param {Phaser.Scene} scene - Phaser scene
 * @param {string} spriteSheetKey - Key of the loaded sprite sheet
 */
export function setupHazardAnimations(scene, spriteSheetKey = 'hazzards_sheet') {
    const texture = scene.textures.get(spriteSheetKey);
    const frameNames = [];
    
    // Frame coordinates as specified:
    // f0: 386,4 - 398,13 (width: 12, height: 9)
    // f1: 402,4 - 414,13 (width: 12, height: 9)
    // f2: 418,4 - 430,13 (width: 12, height: 9)
    // f3: 434,4 - 446,13 (width: 12, height: 9)
    // f4: 450,4 - 462,13 (width: 12, height: 9)
    const frameCoords = [
        { x: 386, y: 4, width: 12, height: 9 },  // f0
        { x: 402, y: 4, width: 12, height: 9 },  // f1
        { x: 418, y: 4, width: 12, height: 9 },  // f2
        { x: 434, y: 4, width: 12, height: 9 },  // f3
        { x: 450, y: 4, width: 12, height: 9 }   // f4
    ];
    
    // Extract frames from sprite sheet using exact coordinates
    frameCoords.forEach((coords, i) => {
        const frameName = `${spriteSheetKey}_frame_${i}`;
        texture.add(frameName, 0, coords.x, coords.y, coords.width, coords.height);
        frameNames.push(frameName);
    });
    
    // Create frame configs for animations
    const frameConfigs = createFrameConfigs(spriteSheetKey, frameNames);
    
    // Create ping-pong animation sequence: 0 → 1 → 2 → 3 → 4 → 3 → 2 → 1 → 0
    const pingPongConfigs = [
        ...frameConfigs,                          // 0,1,2,3,4 (forward)
        ...frameConfigs.slice(0, -1).reverse()   // 3,2,1,0 (backward, excluding duplicate 4)
    ];
    
    // Create hazard animation with ping-pong loop (same for both directions, will be mirrored for right-to-left)
    createAnimation(scene, 'hazard_anim', pingPongConfigs, 10, true);
    
    console.log(`>> Hazard animation created: hazard_anim (0→1→2→3→4→3→2→1→0 ping-pong loop, will be mirrored for right-to-left)`);
    
    return {
        frameNames,
        frameConfigs: pingPongConfigs
    };
}

/**
 * Setup player sprite animations
 * @param {Phaser.Scene} scene - Phaser scene
 * @param {string} spriteSheetKey - Key of the loaded sprite sheet
 */
export function setupPlayerAnimations(scene, spriteSheetKey = 'sprites_sheet') {
    try {
        console.log(`>> Setting up player animations with spriteSheetKey: ${spriteSheetKey}`);
        
        // Verify texture exists
        if (!scene.textures.exists(spriteSheetKey)) {
            console.error(`>> ERROR: Texture '${spriteSheetKey}' not found! Cannot setup player animations.`);
            const availableTextures = Object.keys(scene.textures.list || {});
            console.error(`>> Available textures:`, availableTextures);
            return null;
        }
        
        console.log(`>> Texture '${spriteSheetKey}' found, extracting frames...`);
        const texture = scene.textures.get(spriteSheetKey);
        console.log(`>> Texture dimensions: ${texture.width}x${texture.height}`);
        const frameNames = [];
    
    // Frame coordinates from sprite sheet (exact coordinates):
    // f0: 196,52 - 212,86 (width: 16, height: 34)
    // f1: 221,52 - 235,86 (width: 14, height: 34)
    // f2: 244,52 - 258,86 (width: 14, height: 34)
    // f3: 267,52 - 281,86 (width: 14, height: 34)
    // f4: 290,52 - 304,86 (width: 14, height: 34)
    // f5: 313,52 - 327,86 (width: 14, height: 34)
    // f6: 336,52 - 350,86 (width: 14, height: 34)
    // f7: 359,52 - 373,86 (width: 14, height: 34)
    const frameCoords = [
        { x: 196, y: 52, width: 16, height: 34 },  // f0
        { x: 221, y: 52, width: 14, height: 34 },  // f1
        { x: 244, y: 52, width: 14, height: 34 },  // f2
        { x: 267, y: 52, width: 14, height: 34 },  // f3
        { x: 290, y: 52, width: 14, height: 34 },  // f4
        { x: 313, y: 52, width: 14, height: 34 },  // f5
        { x: 336, y: 52, width: 14, height: 34 },  // f6
        { x: 359, y: 52, width: 14, height: 34 }   // f7
    ];
    
    // Extract frames from sprite sheet using exact coordinates
    // Use same method as hazards (texture.add works for hazards)
    frameCoords.forEach((coords, i) => {
        const frameName = `${spriteSheetKey}_player_frame_${i}`;
        texture.add(frameName, 0, coords.x, coords.y, coords.width, coords.height);
        frameNames.push(frameName);
        console.log(`>> Player frame ${i} added: ${frameName} at (${coords.x}, ${coords.y}) size ${coords.width}x${coords.height}`);
    });
    
    // Verify frames were added
    console.log(`>> Total player frames added: ${frameNames.length}`);
    const missingFrames = frameNames.filter(name => !texture.has(name));
    if (missingFrames.length > 0) {
        console.error(`>> WARNING: ${missingFrames.length} frames not found in texture:`, missingFrames);
    } else {
        console.log(`>> All player frames verified in texture`);
    }
    
    // Create frame configs for animations
    const frameConfigs = createFrameConfigs(spriteSheetKey, frameNames);
    
    // Create player animation: simple 0-7 loop (non-pingpong)
    createAnimation(scene, 'player_anim', frameConfigs, 10, true);
    
    console.log(`>> Player animation created: player_anim (0→1→2→3→4→5→6→7 loop)`);
    
    return {
        frameNames,
        frameConfigs
    };
    } catch (error) {
        console.error(`>> ERROR in setupPlayerAnimations:`, error);
        console.error(`>> Error stack:`, error.stack);
        return null;
    }
}
