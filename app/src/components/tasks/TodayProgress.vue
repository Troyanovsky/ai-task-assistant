<template>
  <div v-if="totalTasks > 0" class="bg-white rounded-lg shadow p-4 mb-4 relative overflow-hidden" ref="containerRef">
    <h3 class="text-lg font-semibold mb-2">Today's Progress</h3>
    <div class="w-full bg-gray-200 rounded-full h-4 relative">
      <div 
        class="bg-blue-500 h-4 rounded-full transition-all duration-500 ease-out" 
        :style="{ width: progressBarWidth }"
      ></div>
      <div 
        class="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white"
        :class="{ 'text-gray-700': percentage < 50 }"
      >
        {{ completedTasks }} / {{ totalTasks }} ({{ percentage }}%)
      </div>
    </div>
    <p class="text-sm text-gray-600 mt-2">
      You have completed {{ completedTasks }} out of {{ totalTasks }} tasks for today.
    </p>
    <!-- Fixed position canvas for confetti that covers the entire component -->
    <div 
      v-if="showConfetti" 
      class="absolute inset-0 pointer-events-none z-10"
      style="overflow: visible;"
    >
      <canvas 
        ref="confettiCanvas" 
        class="absolute inset-0"
        :style="{
          width: canvasWidth + 'px',
          height: canvasHeight + 'px'
        }"
      ></canvas>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import logger from '../../services/logger';

export default {
  name: 'TodayProgress',
  props: {
    totalTasks: {
      type: Number,
      required: true,
      default: 0
    },
    completedTasks: {
      type: Number,
      required: true,
      default: 0
    }
  },
  setup(props) {
    const containerRef = ref(null);
    const confettiCanvas = ref(null);
    const showConfetti = ref(false);
    const canvasWidth = ref(300); // Default width
    const canvasHeight = ref(200); // Default height
    let confettiAnimation = null;
    let particles = [];

    const percentage = computed(() => {
      if (props.totalTasks === 0) {
        return 0;
      }
      return Math.round((props.completedTasks / props.totalTasks) * 100);
    });

    const progressBarWidth = computed(() => {
      return `${percentage.value}%`;
    });

    const createParticles = () => {
      particles = [];
      const colors = ['#f44336', '#2196f3', '#ffeb3b', '#4caf50', '#9c27b0', '#ff9800'];
      
      // Create more particles and position them better
      for (let i = 0; i < 200; i++) {
        particles.push({
          // Start particles centered horizontally
          x: canvasWidth.value * 0.5,
          // Start particles from the progress bar area
          y: canvasHeight.value * 0.25,
          size: Math.random() * 15 + 5, // Even larger particles for visibility
          color: colors[Math.floor(Math.random() * colors.length)],
          speedX: Math.random() * 12 - 6,
          speedY: Math.random() * 4 - 10, // More upward initial motion
          rotation: Math.random() * 360,
          rotationSpeed: Math.random() * 15 - 7.5
        });
      }
    };

    const drawConfetti = () => {
      if (!confettiCanvas.value) return;
      
      const ctx = confettiCanvas.value.getContext('2d');
      ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
      
      let stillAlive = false;
      
      particles.forEach(particle => {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.rotation * Math.PI) / 180);
        ctx.fillStyle = particle.color;
        
        // Draw rectangle confetti pieces
        if (Math.random() > 0.3) {
          ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        } else {
          // Draw circle confetti pieces
          ctx.beginPath();
          ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2, false);
          ctx.fill();
        }
        
        ctx.restore();
        
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.speedY += 0.2; // Increased gravity
        particle.rotation += particle.rotationSpeed;
        
        // Keep particles alive until they're off the bottom of the screen
        if (particle.y < canvasHeight.value * 1.5) {
          stillAlive = true;
        }
      });
      
      if (stillAlive) {
        confettiAnimation = requestAnimationFrame(drawConfetti);
      } else {
        showConfetti.value = false;
      }
    };

    const updateCanvasDimensions = () => {
      if (!containerRef.value) return;
      
      // Get container dimensions
      const rect = containerRef.value.getBoundingClientRect();
      canvasWidth.value = rect.width;
      canvasHeight.value = rect.height;
      
      // Set canvas dimensions if canvas exists
      if (confettiCanvas.value) {
        confettiCanvas.value.width = canvasWidth.value;
        confettiCanvas.value.height = canvasHeight.value;
      }
      
      logger.info('Canvas size updated:', canvasWidth.value, canvasHeight.value);
    };

    const startConfetti = () => {
      // Cancel any existing animation first
      if (confettiAnimation) {
        cancelAnimationFrame(confettiAnimation);
      }
      
      // Show canvas first
      showConfetti.value = true;
      
      // Wait for the next tick to ensure the canvas is in the DOM
      nextTick(() => {
        updateCanvasDimensions();
        
        if (!confettiCanvas.value) {
          logger.error('Canvas not available');
          return;
        }
        
        // Force explicit dimensions if they're zero
        if (canvasWidth.value <= 0 || canvasHeight.value <= 0) {
          logger.error('Canvas dimensions are zero, setting defaults');
          canvasWidth.value = 300;
          canvasHeight.value = 200;
        }
        
        // Set canvas size
        confettiCanvas.value.width = canvasWidth.value;
        confettiCanvas.value.height = canvasHeight.value;
        
        logger.info('Starting confetti with canvas size:', canvasWidth.value, canvasHeight.value);
        createParticles();
        confettiAnimation = requestAnimationFrame(drawConfetti);
      });
    };

    // Debug function to force confetti for testing
    const triggerConfetti = () => {
      logger.info('Triggering confetti');
      startConfetti();
    };

    watch(() => percentage.value, (newValue, oldValue) => {
      logger.info('Percentage changed:', oldValue, '->', newValue);
      if (newValue === 100 && oldValue < 100) {
        startConfetti();
      }
    });

    onMounted(() => {
      // Update canvas dimensions when component is mounted
      nextTick(() => {
        updateCanvasDimensions();
        
        // Check if already at 100% on mount
        if (percentage.value === 100) {
          // Delay the confetti slightly on mount to ensure component is fully rendered
          setTimeout(() => {
            startConfetti();
          }, 500);
        }
      });
      
      // Add resize listener
      window.addEventListener('resize', updateCanvasDimensions);
    });

    onUnmounted(() => {
      if (confettiAnimation) {
        cancelAnimationFrame(confettiAnimation);
      }
      window.removeEventListener('resize', updateCanvasDimensions);
    });

    return {
      containerRef,
      percentage,
      progressBarWidth,
      confettiCanvas,
      showConfetti,
      canvasWidth,
      canvasHeight,
      triggerConfetti
    };
  }
};
</script>

<style scoped>
/* Add any specific styles here if needed */
</style> 