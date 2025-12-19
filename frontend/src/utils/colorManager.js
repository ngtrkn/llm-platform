/**
 * Color Manager
 * Manages colors for detection classes based on configuration
 */

class ColorManager {
  constructor(colorConfig) {
    this.classColors = colorConfig?.class_colors || [
      'rgba(255, 0, 0, 0.5)',
      'rgba(0, 255, 0, 0.5)',
      'rgba(0, 0, 255, 0.5)',
      'rgba(255, 255, 0, 0.5)',
      'rgba(255, 0, 255, 0.5)',
      'rgba(0, 255, 255, 0.5)',
      'rgba(255, 165, 0, 0.5)',
      'rgba(128, 0, 128, 0.5)'
    ];
    
    this.borderColors = colorConfig?.border_colors || [
      'rgba(255, 0, 0, 0.8)',
      'rgba(0, 255, 0, 0.8)',
      'rgba(0, 0, 255, 0.8)',
      'rgba(255, 255, 0, 0.8)',
      'rgba(255, 0, 255, 0.8)',
      'rgba(0, 255, 255, 0.8)',
      'rgba(255, 165, 0, 0.8)',
      'rgba(128, 0, 128, 0.8)'
    ];
    
    this.selectedOpacity = colorConfig?.selected_opacity || 0.7;
    this.dimmedOpacity = colorConfig?.dimmed_opacity || 0.3;
    this.normalOpacity = colorConfig?.normal_opacity || 1.0;
  }

  /**
   * Get background color for a class
   */
  getClassColor(classId) {
    return this.classColors[classId % this.classColors.length];
  }

  /**
   * Get border color for a class
   */
  getBorderColor(classId) {
    return this.borderColors[classId % this.borderColors.length];
  }

  /**
   * Get color with adjusted opacity
   */
  adjustOpacity(color, opacity) {
    if (color.includes('rgba')) {
      return color.replace(/[\d\.]+\)$/, `${opacity})`);
    }
    return color;
  }

  /**
   * Get styles for a detection box
   */
  getBoxStyles(classId, isSelected, isDimmed) {
    const borderColor = this.getBorderColor(classId);
    const backgroundColor = this.getClassColor(classId);
    
    const opacity = isDimmed 
      ? this.dimmedOpacity 
      : (isSelected ? this.selectedOpacity : this.normalOpacity);
    
    const borderWidth = isSelected ? '4px' : '2px';
    const enhancedBorderColor = isSelected 
      ? this.adjustOpacity(borderColor, 1.0)
      : borderColor;
    
    const enhancedBackgroundColor = isSelected
      ? this.adjustOpacity(backgroundColor, 0.7)
      : backgroundColor;
    
    return {
      borderColor: enhancedBorderColor,
      backgroundColor: enhancedBackgroundColor,
      borderWidth,
      opacity
    };
  }

  /**
   * Get styles for segmentation polygon
   */
  getSegmentationStyles(classId, isSelected, isDimmed) {
    const borderColor = this.getBorderColor(classId);
    const fillColor = this.getClassColor(classId);
    
    const opacity = isDimmed 
      ? this.dimmedOpacity 
      : (isSelected ? 0.7 : 0.5);
    
    const strokeWidth = isSelected ? 3 : 2;
    const enhancedBorderColor = isSelected 
      ? this.adjustOpacity(borderColor, 1.0)
      : borderColor;
    
    const enhancedFillColor = isSelected
      ? this.adjustOpacity(fillColor, 0.6)
      : fillColor;
    
    return {
      fill: enhancedFillColor,
      stroke: enhancedBorderColor,
      strokeWidth,
      opacity
    };
  }
}

export default ColorManager;
