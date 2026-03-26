// Camera Perspectives Configuration
export const cameraPerspectives = {
  desktop: {
    coder: { position: { x: -0.172, y: 0.212, z: 0.667 }, target: { x: 0.276, y: -0.194, z: 0.409 } },
    about: { position: { x: -0.022, y: 0.981, z: 0.489 }, target: { x: -0.356, y: 0.497, z: -0.143 } },
    contact: { position: { x: -0.149, y: 0.477, z: 0.679 }, target: { x: 0.655, y: 0.665, z: -0.064 } },
    portfolio: { position: { x: 1.760, y: -0.764, z: 0.337 }, target: { x: 0.603, y: -0.166, z: -0.290 } }
  },
  mobile: {
    coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } },
    about: { position: { x: -0.031, y: 1.064, z: 0.431 }, target: { x: -0.025, y: 0.995, z: 0.006 } },
    contact: { position: { x: 0.056, y: 0.628, z: 1.119 }, target: { x: 0.083, y: 0.761, z: 0.083 } },
    portfolio: { position: { x: 2.354, y: -0.486, z: 1.339 }, target: { x: 0.135, y: 0.490, z: -0.030 } }
  }
};

// Specific overrides for exact resolutions
export const definedResolutionSettings = [
  {
    width: 432, height: 874,
    settings: {
      coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } },
      about: { position: { x: 0.068, y: 0.839, z: 1.593 }, target: { x: -0.289, y: 0.235, z: 0.166 } },
      portfolio: { position: { x: 3.053, y: -0.199, z: 1.418 }, target: { x: 0.301, y: 0.927, z: 0.013 } },
      contact: { position: { x: 0.121, y: 0.576, z: 0.898 }, target: { x: 0.142, y: 0.681, z: 0.074 } }
    }
  },
  {
    width: 394, height: 794,
    settings: {
      coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } },
      about: { position: { x: -0.072, y: 0.771, z: 1.579 }, target: { x: -0.353, y: 0.258, z: 0.072 } },
      portfolio: { position: { x: 2.623, y: -0.319, z: 1.518 }, target: { x: 0.210, y: 0.743, z: 0.029 } },
      contact: { position: { x: 0.068, y: 0.635, z: 0.926 }, target: { x: 0.184, y: 0.754, z: 0.192 } }
    }
  },
  {
    width: 360, height: 776,
    settings: {
      coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } },
      about: { position: { x: -0.236, y: 0.514, z: 1.837 }, target: { x: -0.343, y: 0.230, z: 0.110 } },
      portfolio: { position: { x: 2.816, y: -0.285, z: 1.627 }, target: { x: 0.247, y: 0.845, z: 0.042 } },
      contact: { position: { x: 0.497, y: 0.491, z: 0.960 }, target: { x: 0.133, y: 0.684, z: 0.098 } }
    }
  },
  {
    width: 412, height: 891,
    settings: {
      coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } },
      about: { position: { x: 0.389, y: 0.396, z: 1.408 }, target: { x: -0.214, y: 0.258, z: 0.054 } },
      portfolio: { position: { x: 2.710, y: -0.267, z: 1.636 }, target: { x: 0.210, y: 0.833, z: 0.093 } },
      contact: { position: { x: 0.450, y: 0.523, z: 0.850 }, target: { x: 0.116, y: 0.610, z: 0.022 } }
    }
  },
  {
    width: 915, height: 1792,
    settings: {
      coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } },
      about: { position: { x: 0.433, y: 1.010, z: 0.890 }, target: { x: -0.134, y: 0.263, z: -0.087 } },
      portfolio: { position: { x: 2.694, y: -0.445, z: 1.355 }, target: { x: 0.691, y: 0.591, z: 0.269 } },
      contact: { position: { x: 0.433, y: 0.406, z: 1.269 }, target: { x: 0.137, y: 0.196, z: -0.443 } }
    }
  },
  {
    width: 1024, height: 1342,
    settings: {
      coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } },
      about: { position: { x: -0.062, y: 0.855, z: 0.431 }, target: { x: -0.088, y: 0.704, z: -0.024 } },
      portfolio: { position: { x: 2.093, y: -0.621, z: 0.696 }, target: { x: 0.540, y: 0.152, z: 0.099 } },
      contact: { position: { x: 0.047, y: 0.413, z: 0.805 }, target: { x: 0.091, y: 0.493, z: -0.108 } }
    }
  },
  {
    width: 800, height: 1236,
    settings: {
      coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } },
      about: { position: { x: -0.084, y: 0.794, z: 0.524 }, target: { x: -0.073, y: 0.681, z: -0.274 } },
      portfolio: { position: { x: 2.096, y: -0.615, z: 1.088 }, target: { x: 0.513, y: 0.204, z: 0.230 } },
      contact: { position: { x: -0.403, y: -0.134, z: 1.743 }, target: { x: 0.591, y: 0.056, z: -0.320 } }
    }
  },
  {
    width: 900, height: 1156,
    settings: {
      coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } },
      about: { position: { x: -0.160, y: 0.821, z: 0.390 }, target: { x: -0.136, y: 0.731, z: -0.291 } },
      portfolio: { position: { x: 2.091, y: -0.697, z: 0.371 }, target: { x: 0.493, y: 0.120, z: -0.023 } },
      contact: { position: { x: 0.145, y: 0.294, z: 1.692 }, target: { x: 0.423, y: 0.042, z: -0.210 } }
    }
  }
];

export const initialModelRotations = {
  coder: { x: 0, y: 0, z: 0 },
  about: { x: 0, y: 0, z: 0 },
  contact: { x: 0, y: 0, z: 0 },
  portfolio: { x: 0, y: 0, z: 0 }
};

export const initialZoomStartPositions = {
  desktop: {
    position: { x: -10, y: 5, z: 15 },
    target: { x: 0, y: 0, z: 0 }
  },
  mobile: {
    position: { x: -15, y: 8, z: 20 },
    target: { x: 0, y: 0, z: 0 }
  }
};

export const targetAnimationNameMap = {
  coder: 'Home',
  about: 'About',
  contact: 'Contact',
  portfolio: 'Portfolio'
};

export const asciiCharacters = ' .:-~=+*#%@█';
export const asciiResolution = 0.2;
export const asciiScale = 1;
export const modelRotationSpeed = 0.004;

// Function to get responsive camera settings
export function getResponsiveCameraSettings(modelKey) {
  const currentWidth = window.innerWidth;
  const currentHeight = window.innerHeight;

  // 1. Try for an exact match first
  for (const config of definedResolutionSettings) {
    if (config.width === currentWidth && config.height === currentHeight) {
      if (config.settings && config.settings[modelKey]) {
        return config.settings[modelKey];
      }
    }
  }

  // Determine the maximum width from definedResolutionSettings
  let maxWidthFromDefined = 0;
  const validWidths = definedResolutionSettings
    .filter(config => typeof config.width === 'number')
    .map(config => config.width);

  if (validWidths.length > 0) {
    maxWidthFromDefined = Math.max(...validWidths);
  }

  // 2. If current width is greater than the maximum width among defined, use general desktop settings
  if (maxWidthFromDefined > 0 && currentWidth > maxWidthFromDefined) {
    return cameraPerspectives.desktop[modelKey] || cameraPerspectives.desktop.coder;
  }

  // 3. Find the closest one among defined resolutions
  let closestConfig = null;
  let minDifference = Infinity;

  if (definedResolutionSettings.length > 0) {
    for (const config of definedResolutionSettings) {
      if (typeof config.width === 'number' && typeof config.height === 'number') {
        const diff = Math.abs(currentWidth - config.width) + Math.abs(currentHeight - config.height);
        if (diff < minDifference) {
          minDifference = diff;
          closestConfig = config;
        }
      }
    }

    if (closestConfig && closestConfig.settings && closestConfig.settings[modelKey]) {
      return closestConfig.settings[modelKey];
    }
  }

  // 4. Ultimate fallback to general mobile/desktop
  if (window.innerWidth <= 768) {
    return cameraPerspectives.mobile[modelKey] || cameraPerspectives.desktop[modelKey] || cameraPerspectives.desktop.coder;
  }
  return cameraPerspectives.desktop[modelKey] || cameraPerspectives.desktop.coder;
}
