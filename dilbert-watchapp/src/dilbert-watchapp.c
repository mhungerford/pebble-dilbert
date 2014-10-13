#include <pebble.h>

// PNG support
// Includes Grayscale support for 1 bit (B&W)
#include "png.h"

#define MAX(A,B) ((A>B) ? A : B)
#define MIN(A,B) ((A<B) ? A : B)

static Window *window;
static TextLayer *text_layer;

//Image Display
static BitmapLayer* bitmap_layer = NULL;
static GBitmap* gbitmap_ptr = NULL;

enum appKeys {
  button_event,
  png_data
};

static void send_button_event(int button) {
  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
  if (!iter) return;
  dict_write_uint8(iter, button_event, button);
  dict_write_end(iter);
  app_message_outbox_send();
}

static void up_click_handler(ClickRecognizerRef recognizer, void *context) {
  send_button_event(1);
}

static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  send_button_event(2);
}

static void down_click_handler(ClickRecognizerRef recognizer, void *context) {
  send_button_event(3);
}

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
  window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  //Create bitmap layer for background image
  bitmap_layer = bitmap_layer_create(bounds);
  //Add bitmap_layer to window layer
  layer_add_child(window_layer, bitmap_layer_get_layer(bitmap_layer));


  text_layer = text_layer_create((GRect) { .origin = { 0, 72 }, .size = { bounds.size.w, 20 } });
  text_layer_set_text(text_layer, "Loading...");
  text_layer_set_text_alignment(text_layer, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(text_layer));
}

static void window_unload(Window *window) {
  free(gbitmap_ptr);
  text_layer_destroy(text_layer);
}

static void in_received_handler(DictionaryIterator *iter, void *context) {
  Tuple *tuple = dict_read_first(iter);
  while (tuple) {
    switch (tuple->key) {
    case png_data:
      {
        //APP_LOG(APP_LOG_LEVEL_DEBUG, "received png_data:%d bytes", tuple->length);
        int png_size = tuple->length;
        char *png_buffer = malloc(png_size);
        // TODO: need to copy for now, as upng frees the buffer, fix eventually
        memcpy(png_buffer, tuple->value->data, tuple->length);
        free(gbitmap_ptr);
        gbitmap_ptr = gbitmap_create_with_png_data((uint8_t*)png_buffer, png_size);
        layer_set_hidden(text_layer_get_layer(text_layer),true);
        bitmap_layer_set_bitmap(bitmap_layer, gbitmap_ptr);
        layer_mark_dirty(bitmap_layer_get_layer(bitmap_layer));
      }
      break;
    default:
      break;
    }
    tuple = dict_read_next(iter);
  }
}

static void in_dropped_handler(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "App Message Dropped!");
}

static void app_message_init(void) {
  // Register message handlers
  app_message_register_inbox_received(in_received_handler);
  app_message_register_inbox_dropped(in_dropped_handler);
  //app_message_register_outbox_sent(out_sent_handler);
  //app_message_register_outbox_failed(out_failed_handler);

  // Init AppMessage buffers (larger than MAX_CHUNKSIZE for chunk tuple overhead)
  app_message_open(app_message_inbox_size_maximum(), 96);
}

static void init(void) {
  app_message_init();

  window = window_create();
  window_set_fullscreen(window, true);
  window_set_click_config_provider(window, click_config_provider);
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
  });
  const bool animated = true;
  window_stack_push(window, animated);
}

static void deinit(void) {
  window_destroy(window);
}

int main(void) {
  init();

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", window);

  app_event_loop();
  deinit();
}
