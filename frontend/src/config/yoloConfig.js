/**
 * YOLO Configuration Manager
 * Loads and manages YOLO model configuration from YAML file
 */

class YOLOConfig {
  constructor() {
    this.config = null;
    this.loaded = false;
  }

  /**
   * Load configuration from YAML file
   */
  async loadConfig() {
    if (this.loaded && this.config) {
      return this.config;
    }

    try {
      const response = await fetch('/config/yolo-config.yaml');
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`);
      }
      
      const yamlText = await response.text();
      const yaml = await import('js-yaml');
      this.config = yaml.load(yamlText);
      this.loaded = true;
      return this.config;
    } catch (error) {
      console.error('Error loading YOLO config:', error);
      // Return default config if loading fails
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration (fallback)
   */
  getDefaultConfig() {
    return {
      models: {
        yolo11n: {
          name: "yolo11n.pt",
          display_name: "YOLOv11 Nano",
          family: "yolo11",
          size: "nano",
          default: true
        }
      },
      ui: {
        default_confidence: 0.25,
        default_iou: 0.45,
        visualization: {
          show_boxes_by_default: true,
          show_segmentation_by_default: true
        },
        colors: {
          class_colors: [
            'rgba(255, 0, 0, 0.5)',
            'rgba(0, 255, 0, 0.5)',
            'rgba(0, 0, 255, 0.5)',
            'rgba(255, 255, 0, 0.5)',
            'rgba(255, 0, 255, 0.5)',
            'rgba(0, 255, 255, 0.5)',
            'rgba(255, 165, 0, 0.5)',
            'rgba(128, 0, 128, 0.5)'
          ],
          border_colors: [
            'rgba(255, 0, 0, 0.8)',
            'rgba(0, 255, 0, 0.8)',
            'rgba(0, 0, 255, 0.8)',
            'rgba(255, 255, 0, 0.8)',
            'rgba(255, 0, 255, 0.8)',
            'rgba(0, 255, 255, 0.8)',
            'rgba(255, 165, 0, 0.8)',
            'rgba(128, 0, 128, 0.8)'
          ]
        }
      }
    };
  }

  /**
   * Get all available models
   */
  async getModels() {
    const config = await this.loadConfig();
    return Object.values(config.models || {});
  }

  /**
   * Get default model
   */
  async getDefaultModel() {
    const config = await this.loadConfig();
    const models = Object.values(config.models || {});
    const defaultModel = models.find(m => m.default) || models[0];
    return defaultModel?.name || 'yolo11n.pt';
  }

  /**
   * Get model by name
   */
  async getModel(modelName) {
    const config = await this.loadConfig();
    return Object.values(config.models || {}).find(m => m.name === modelName);
  }

  /**
   * Get UI configuration
   */
  async getUIConfig() {
    const config = await this.loadConfig();
    return config.ui || {};
  }

  /**
   * Get default confidence threshold
   */
  async getDefaultConfidence() {
    const config = await this.loadConfig();
    return config.ui?.default_confidence || 0.25;
  }

  /**
   * Get default IoU threshold
   */
  async getDefaultIoU() {
    const config = await this.loadConfig();
    return config.ui?.default_iou || 0.45;
  }

  /**
   * Get visualization settings
   */
  async getVisualizationSettings() {
    const config = await this.loadConfig();
    return config.ui?.visualization || {};
  }

  /**
   * Get color configuration
   */
  async getColorConfig() {
    const config = await this.loadConfig();
    return config.ui?.colors || {};
  }
}

// Export singleton instance
export const yoloConfig = new YOLOConfig();
export default yoloConfig;
