import telebot
from telebot import types
import requests
from datetime import date
import logging
import os
import constants
import api_constants

logger = telebot.logger
telebot.logger.setLevel(logging.DEBUG)
bot = telebot.TeleBot(os.environ.get("BOT_API_KEY"), parse_mode=None)


@bot.message_handler(commands=['start'])
def response_to_start_action(message):
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton(
        "Checkout author", url=constants.AUTHOR_WEBSITE))
    bot.send_message(message.chat.id, "Howdy, you can choose any of these and update your life data tracker.\n\n" +
                     "/quick - Show quick entry options.\n" +
                     "/sport - Mark a sport you played.", reply_markup=markup)


@bot.message_handler(commands=['sport'])
def response_to_sport_action(message):
    markup = types.ReplyKeyboardMarkup(row_width=2, selective=False)
    itembtn1 = types.KeyboardButton(f'{constants.CRICKET}')
    itembtn2 = types.KeyboardButton(f'{constants.FOOTBALL}')
    itembtn3 = types.KeyboardButton(f'{constants.BADMINTON}')
    itembtn4 = types.KeyboardButton(f'{constants.BACK}')
    markup.add(itembtn1, itembtn2, itembtn3, itembtn4)
    bot.send_message(message.chat.id, "What did you play?",
                     reply_markup=markup)
    bot.register_next_step_handler(message, handle_sport_played)


@bot.message_handler(commands=['quick'])
def response_to_quick_action(message):
    markup = types.ReplyKeyboardMarkup(row_width=2, selective=False)
    itembtn1 = types.KeyboardButton(f'{constants.MARK_WORKOUT}')
    itembtn2 = types.KeyboardButton(f'{constants.MARK_MEDITATION}')
    itembtn3 = types.KeyboardButton(f'{constants.CANCEL}')
    markup.add(itembtn1, itembtn2, itembtn3)
    bot.send_message(message.chat.id, "What would you like to mark?",
                     reply_markup=markup)
    bot.register_next_step_handler(message, handle_quick_options)




def handle_sport_played(message):
    if message.text == constants.CRICKET:
        try:
            response = requests.post(
                f'{api_constants.BASE_URL}{api_constants.ADD_SPORT_ENDPOINT}', json={"sport": "cricket"})
        except requests.exceptions.ConnectionError:
            bot.send_message(
                message.chat.id, 'An unexpected error occured.', reply_markup=types.ReplyKeyboardRemove())
            return
        if response.status_code == 201:
            bot.send_message(
                message.chat.id, f'Cricket played on {date.today()}.', reply_markup=types.ReplyKeyboardRemove())
        elif response.status_code == 400:
            bot.send_message(
                message.chat.id, response.json()["error"], reply_markup=types.ReplyKeyboardRemove())
    elif message.text == constants.FOOTBALL:
        try:
            response = requests.post(
                f'{api_constants.BASE_URL}{api_constants.ADD_SPORT_ENDPOINT}', json={"sport": "football"})
        except requests.exceptions.ConnectionError:
            bot.send_message(
                message.chat.id, 'An unexpected error occured.', reply_markup=types.ReplyKeyboardRemove())
            return
        if response.status_code == 201:
            bot.send_message(
                message.chat.id, f'Football played on {date.today()}.', reply_markup=types.ReplyKeyboardRemove())
        elif response.status_code == 400:
            bot.send_message(
                message.chat.id, response.json()["error"], reply_markup=types.ReplyKeyboardRemove())
    elif message.text == constants.BADMINTON:
        try:
            response = requests.post(
                f'{api_constants.BASE_URL}{api_constants.ADD_SPORT_ENDPOINT}', json={"sport": "badminton"})
        except requests.exceptions.ConnectionError:
            bot.send_message(
                message.chat.id, 'An unexpected error occured.', reply_markup=types.ReplyKeyboardRemove())
            return
        if response.status_code == 201:
            bot.send_message(
                message.chat.id, f'Football played on {date.today()}.', reply_markup=types.ReplyKeyboardRemove())
        elif response.status_code == 400:
            bot.send_message(
                message.chat.id, response.json()["error"], reply_markup=types.ReplyKeyboardRemove())
    elif message.text == constants.BACK:
        bot.send_message(
            message.chat.id, "Okay.", reply_markup=types.ReplyKeyboardRemove())

def handle_quick_options(message):
    if (message.text == f'{constants.MARK_WORKOUT}'):
        try:
            response = requests.post(
                f'{api_constants.BASE_URL}{api_constants.ADD_WORKOUT_ENDPOINT}')
        except requests.exceptions.ConnectionError:
            bot.send_message(
                message.chat.id, 'An unexpected error occured.', reply_markup=types.ReplyKeyboardRemove())
            return
        if response.status_code == 201:
            bot.send_message(
                message.chat.id, f'Gym entry made for {date.today()}.', reply_markup=types.ReplyKeyboardRemove())
        elif response.status_code == 400:
            bot.send_message(
                message.chat.id, response.json()["error"], reply_markup=types.ReplyKeyboardRemove())
    elif (message.text == f'{constants.MARK_MEDITATION}'):
        try:
            response = requests.post(
                f'{api_constants.BASE_URL}{api_constants.ADD_MEDITATION_ENDPOINT}')
        except requests.exceptions.ConnectionError:
            bot.send_message(
                message.chat.id, 'An unexpected error occured.', reply_markup=types.ReplyKeyboardRemove())
            return
        if response.status_code == 201:
            bot.send_message(
                message.chat.id, f'Meditation entry made for {date.today()}.', reply_markup=types.ReplyKeyboardRemove())
        elif response.status_code == 400:
            bot.send_message(
                message.chat.id, response.json()["error"], reply_markup=types.ReplyKeyboardRemove())
    elif message.text == f'{constants.CANCEL}' or message.text == f'{constants.BACK}':
        bot.send_message(message.chat.id, "Okay.",
                         reply_markup=types.ReplyKeyboardRemove())
    else:
        logger.error(f"Quick options invalid input - {message.text}")
        bot.send_message(
            message.chat.id, 'Invalid input.', reply_markup=types.ReplyKeyboardRemove())


# Enable saving next step handlers to file "./.handlers-saves/step.save".
# Delay=2 means that after any change in next step handlers (e.g. calling register_next_step_handler())
# saving will hapen after delay 2 seconds.
bot.enable_save_next_step_handlers(delay=5)

# Load next_step_handlers from save file (default "./.handlers-saves/step.save")
# WARNING It will work only if enable_save_next_step_handlers was called!
bot.load_next_step_handlers()

bot.infinity_polling()
