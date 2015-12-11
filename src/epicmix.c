#include <pebble.h>

static Window *window;
static TextLayer *username_layer = NULL;
static TextLayer *vertical_layer = NULL;
static char username_text[20];
static char vertical_text[20];

enum {
  KEY_FETCH = 0x0,
  KEY_USERNAME = 0x1,
  KEY_VERTICAL = 0x2,
};

static void do_refresh(void) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "do_refresh with username layer %p", username_layer);

  Tuplet fetch_tuple = TupletInteger(KEY_FETCH, 1);
  // Tuplet symbol_tuplet = TupletCString(..., "blah");

  if (username_layer)
    text_layer_set_text(username_layer, "Loading...");
  if (vertical_layer)
    text_layer_set_text(vertical_layer, "--- ft");

  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);

  if (iter == NULL) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "NULL iter???");
    return;
  }

  dict_write_tuplet(iter, &fetch_tuple);
  dict_write_end(iter);

  app_message_outbox_send();
}

static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  do_refresh();
}

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
  //window_long_click_subscribe(BUTTON_ID_SELECT, 0, select_long_click_handler, NULL);
}

static void in_received_handler(DictionaryIterator *iter, void *context) {
  Tuple *username_tuple = dict_find(iter, KEY_USERNAME);
  Tuple *vertical_tuple = dict_find(iter, KEY_VERTICAL);
  
  APP_LOG(APP_LOG_LEVEL_DEBUG, "I have heard something from the phone!");
  
  if (dict_find(iter, KEY_FETCH)) {
    /* Ok, starting up. */
    do_refresh();
  }

  if (username_tuple) {
    strncpy(username_text, username_tuple->value->cstring, sizeof(username_text));
    text_layer_set_text(username_layer, username_text);
    
    APP_LOG(APP_LOG_LEVEL_DEBUG, "received with username text %s", username_text);
  }
  if (vertical_tuple) {
    snprintf(vertical_text, sizeof(vertical_text), "%lu ft", vertical_tuple->value->uint32);
    text_layer_set_text(vertical_layer, vertical_text);
    
    APP_LOG(APP_LOG_LEVEL_DEBUG, "received with vertical text %s", vertical_text);
  }
}

static void in_dropped_handler(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "App Message Dropped!");
}

static void out_failed_handler(DictionaryIterator *failed, AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "App Message Failed to Send!");
}

static void app_message_init(void) {
  // Register message handlers
  app_message_register_inbox_received(in_received_handler);
  app_message_register_inbox_dropped(in_dropped_handler);
  app_message_register_outbox_failed(out_failed_handler);
  // Init buffers
  app_message_open(64, 64);
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  username_layer = text_layer_create(
      (GRect) { .origin = { 0, 20 }, .size = { bounds.size.w, 50 } });
  text_layer_set_text(username_layer, "waiting for phone");
  text_layer_set_text_alignment(username_layer, GTextAlignmentCenter);
  text_layer_set_font(username_layer, fonts_get_system_font(FONT_KEY_GOTHIC_14));
  layer_add_child(window_layer, text_layer_get_layer(username_layer));

  vertical_layer = text_layer_create(
      (GRect) { .origin = { 0, 75 }, .size = { bounds.size.w, 50 } });
  text_layer_set_text(vertical_layer, ". . .");
  text_layer_set_text_alignment(vertical_layer, GTextAlignmentCenter);
  text_layer_set_font(vertical_layer, fonts_get_system_font(FONT_KEY_BITHAM_30_BLACK));
  layer_add_child(window_layer, text_layer_get_layer(vertical_layer));
}

static void window_unload(Window *window) {
  text_layer_destroy(username_layer);
  text_layer_destroy(vertical_layer);
}

static void init(void) {
  window = window_create();
  app_message_init();
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
