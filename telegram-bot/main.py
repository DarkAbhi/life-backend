import telebot
from telebot import types
import requests
from datetime import date
import api_constants
import constants
from telegram_bot_calendar import DetailedTelegramCalendar, LSTEP
import os
import utils
import logging


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
                     "/sport - Mark a sport you played.\n" +
                     "/personal - Update personal details.\n" +
                     "/transactions - Add/view recent transactions", reply_markup=markup)


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


@bot.message_handler(commands=['personal'])
def response_to_personal_action(message):
    markup = types.ReplyKeyboardMarkup(row_width=2, selective=False)
    itembtn1 = types.KeyboardButton(f'{constants.INVESTMENTS}')
    itembtn2 = types.KeyboardButton(f'{constants.HEIGHT_WEIGHT}')
    itembtn3 = types.KeyboardButton(f'{constants.CANCEL}')
    markup.add(itembtn1, itembtn2, itembtn3)
    bot.send_message(message.chat.id, "What would you like to update?",
                     reply_markup=markup)
    bot.register_next_step_handler(message, handle_personal_options)


@bot.message_handler(commands=['transactions'])
def response_to_transaction_action(message):
    markup = types.ReplyKeyboardMarkup(row_width=2, selective=False)
    itembtn1 = types.KeyboardButton(f'{constants.ADD_TRANSACTION}')
    itembtn2 = types.KeyboardButton(f'{constants.VIEW_TRANSACTIONS}')
    markup.add(itembtn1, itembtn2)
    bot.send_message(message.chat.id, "Do you want to add a transaction or view recent transactions?",
                     reply_markup=markup)
    bot.register_next_step_handler(message, handle_transactions_option)


def handle_transactions_option(message):
    if message.text == constants.ADD_TRANSACTION:
        calendar, step = DetailedTelegramCalendar(
            max_date=date.today()).build()
        bot.send_message(message.chat.id,
                         f"Okay.",
                         reply_markup=types.ReplyKeyboardRemove())
        bot.send_message(message.chat.id,
                         f"Select {LSTEP[step]}",
                         reply_markup=calendar)
    elif message.text == constants.VIEW_TRANSACTIONS:
        try:
            response = requests.get(
                f'{api_constants.BASE_URL}{api_constants.TRANSACTION_ENDPOINT}')
            transactions = response.json()
            text = "Here are your recent transactions\n"
            for transaction in transactions:
                text = text + \
                    f'Name: *{transaction["name"]}*, you spent ₹{transaction["amount"]}\n'
            bot.send_message(
                message.chat.id, text, reply_markup=types.ReplyKeyboardRemove())
        except requests.exceptions.ConnectionError:
            logger.error(
                "Fetching recent transactions API request connection error")
            bot.send_message(
                message.chat.id, 'An unexpected error occured.', reply_markup=types.ReplyKeyboardRemove())


@bot.callback_query_handler(func=DetailedTelegramCalendar.func())
def cal(c):
    result, key, step = DetailedTelegramCalendar(
        max_date=date.today(), current_date=date.today()).process(c.data)
    if not result and key:
        bot.edit_message_text(f"Select {LSTEP[step]}",
                              c.message.chat.id,
                              c.message.message_id,
                              reply_markup=key)
    elif result:
        bot.edit_message_text(f"You selected {result}",
                              c.message.chat.id,
                              c.message.message_id)
        bot.send_message(c.message.chat.id, "Enter transaction name",
                         reply_markup=types.ReplyKeyboardRemove())
        bot.register_next_step_handler(
            c.message, handle_transaction_name_input, str(result))


def handle_transaction_name_input(message, transaction_date):
    bot.send_message(message.chat.id, f'Great! The transaction name is *{message.text}*.',
                     parse_mode='Markdown')
    bot.reply_to(message, "Now enter the amount")
    bot.register_next_step_handler(
        message, handle_transaction_amount_input, message.text, transaction_date)


def handle_transaction_amount_input(message, transaction_name, transaction_date):
    markup = types.ReplyKeyboardMarkup(row_width=2, selective=False)
    itembtn1 = types.KeyboardButton(f'{constants.ENTERTAINMENT}')
    itembtn2 = types.KeyboardButton(f'{constants.SHOPPING}')
    itembtn3 = types.KeyboardButton(f'{constants.TRANSPORT}')
    itembtn4 = types.KeyboardButton(f'{constants.FUEL}')
    itembtn5 = types.KeyboardButton(f'{constants.EDUCATION}')
    itembtn6 = types.KeyboardButton(f'{constants.BILLS_AND_UTILITIES}')
    itembtn7 = types.KeyboardButton(f'{constants.HEALTH_AND_WELLNESS}')
    itembtn8 = types.KeyboardButton(f'{constants.GROCERIES}')
    itembtn9 = types.KeyboardButton(f'{constants.TRIPS}')
    itembtn10 = types.KeyboardButton(f'{constants.GADGETS}')
    itembtn11 = types.KeyboardButton(f'{constants.FITNESS}')
    itembtn12 = types.KeyboardButton(f'{constants.FOOD}')
    itembtn13 = types.KeyboardButton(f'{constants.CANCEL}')
    markup.add(itembtn1, itembtn2, itembtn3, itembtn4, itembtn5,
               itembtn6, itembtn7, itembtn8, itembtn9, itembtn10, itembtn11, itembtn12, itembtn13)
    bot.send_message(message.chat.id, "Now choose a category.",
                     reply_markup=markup)
    bot.register_next_step_handler(
        message, handle_transaction_category_input, transaction_name, transaction_date, message.text)


def handle_transaction_category_input(message, transaction_name, transaction_date, transaction_amount):
    if message.text == constants.FUEL:
        markup = types.ReplyKeyboardMarkup(row_width=2, selective=False)
        itembtn1 = types.KeyboardButton(f'{constants.YES}')
        itembtn2 = types.KeyboardButton(f'{constants.NO}')
        markup.add(itembtn1, itembtn2)
        bot.send_message(message.chat.id, "Do you want to tag which vehicle you refueled?",
                         reply_markup=markup)
        bot.register_next_step_handler(
            message, process_transaction_vehicle_query, transaction_name, transaction_date, transaction_amount, message.text)
    elif message.text == constants.CANCEL:
        bot.send_message(message.chat.id, "Okay.",
                         reply_markup=types.ReplyKeyboardRemove())
    else:
        try:
            response = requests.post(
                f'{api_constants.BASE_URL}{api_constants.TRANSACTION_ENDPOINT}',
                json={"name": transaction_name, "amount": transaction_amount, "date": transaction_date, "category": utils.get_category_id(message.text)})
            if response.status_code == 201:
                bot.send_message(message.chat.id, "Transaction has been saved.",
                                 reply_markup=types.ReplyKeyboardRemove())
        except requests.exceptions.ConnectionError:
            logger.error("Creating expense API request connection error")
            bot.send_message(
                message.chat.id, 'An unexpected error occured.', reply_markup=types.ReplyKeyboardRemove())


def process_transaction_vehicle_query(message, transaction_name, transaction_date, transaction_amount, transaction_category):
    if message.text == constants.YES:
        try:
            response = requests.get(
                f'{api_constants.BASE_URL}{api_constants.GET_ALL_VEHICLES_ENDPOINT}')
            markup = types.ReplyKeyboardMarkup(row_width=2, selective=False)
            for vehicle in response.json():
                itembtn = types.KeyboardButton(f'{vehicle["name"]}')
                markup.add(itembtn)
            bot.send_message(message.chat.id, "Choose vehicle",
                             reply_markup=markup)
            bot.register_next_step_handler(
                message, handle_vehicle_input, transaction_name, transaction_date, transaction_amount, transaction_category)
        except requests.exceptions.ConnectionError:
            logger.error("Get user's vehicles API request connection error")
            bot.send_message(
                message.chat.id, 'An unexpected error occured.', reply_markup=types.ReplyKeyboardRemove())
            return
    elif message.text == constants.NO:
        try:
            response = requests.post(
                f'{api_constants.BASE_URL}{api_constants.TRANSACTION_ENDPOINT}',
                json={"name": transaction_name, "amount": transaction_amount, "date": transaction_date, "category": utils.get_category_id(transaction_category)})
            if response.status_code == 201:
                bot.send_message(message.chat.id, "Transaction has been saved.",
                                 reply_markup=types.ReplyKeyboardRemove())
        except requests.exceptions.ConnectionError:
            logger.error(
                "Creating expense no vehicle selected API request connection error")
            bot.send_message(
                message.chat.id, 'An unexpected error occured.', reply_markup=types.ReplyKeyboardRemove())


def handle_vehicle_input(message, transaction_name, transaction_date, transaction_amount, transaction_category):
    try:
        response = requests.post(
            f'{api_constants.BASE_URL}{api_constants.TRANSACTION_ENDPOINT}',
            json={
                "name": transaction_name,
                "amount": transaction_amount,
                "date": transaction_date,
                "category": utils.get_category_id(transaction_category),
                "vehicle": message.text
            }
        )
        if response.status_code == 201:
            bot.send_message(message.chat.id, "Transaction has been saved.",
                             reply_markup=types.ReplyKeyboardRemove())
    except requests.exceptions.ConnectionError:
        logger.error(
            "Creating expense fuel category with vehicle API request connection error")
        bot.send_message(
            message.chat.id, 'An unexpected error occured.', reply_markup=types.ReplyKeyboardRemove())


def handle_personal_options(message):
    if message.text == constants.INVESTMENTS:
        markup = types.ReplyKeyboardMarkup(row_width=2, selective=False)
        itembtn1 = types.KeyboardButton(f'{constants.STOCKS}')
        itembtn2 = types.KeyboardButton(f'{constants.MUTUTAL_FUNDS}')
        itembtn3 = types.KeyboardButton(f'{constants.CRYPTO}')
        itembtn4 = types.KeyboardButton(f'{constants.CANCEL}')
        markup.add(itembtn1, itembtn2, itembtn3, itembtn4)
        bot.send_message(message.chat.id, "What would you like to update?",
                         reply_markup=markup)
        bot.register_next_step_handler(message, handle_investments_type)
    elif message.text == constants.HEIGHT_WEIGHT:
        markup = types.ReplyKeyboardMarkup(row_width=2, selective=False)
        itembtn1 = types.KeyboardButton(f'{constants.HEIGHT}')
        itembtn2 = types.KeyboardButton(f'{constants.WEIGHT}')
        itembtn3 = types.KeyboardButton(f'{constants.CANCEL}')
        markup.add(itembtn1, itembtn2, itembtn3)
        bot.send_message(message.chat.id, "Do you want to update your height or weight?",
                         reply_markup=markup)
        bot.register_next_step_handler(message, handle_height_weight_input)
    elif message.text == constants.CANCEL:
        bot.send_message(
            message.chat.id, 'Okay.', reply_markup=types.ReplyKeyboardRemove())
    else:
        logger.error(
            f"Personal options invalid input received - {message.text}")
        bot.send_message(
            message.chat.id, 'Invalid input.', reply_markup=types.ReplyKeyboardRemove())


def handle_height_weight_input(message):
    if message.text == constants.HEIGHT:
        bot.send_message(
            message.chat.id, 'Enter height.', reply_markup=types.ReplyKeyboardRemove())
        bot.register_next_step_handler(
            message, handle_height_weight_update, constants.HEIGHT)
    elif message.text == constants.WEIGHT:
        bot.send_message(
            message.chat.id, 'Enter weight.', reply_markup=types.ReplyKeyboardRemove())
        bot.register_next_step_handler(
            message, handle_height_weight_update, constants.WEIGHT)
    elif message.text == constants.CANCEL:
        bot.send_message(
            message.chat.id, 'Okay.', reply_markup=types.ReplyKeyboardRemove())
    else:
        logger.error(
            f"Height or weight invalid input received - {message.text}")
        bot.send_message(
            message.chat.id, 'Invalid input.', reply_markup=types.ReplyKeyboardRemove())


def handle_height_weight_update(message, type):
    try:
        value = float(message.text)
        if type == constants.HEIGHT:
            response = requests.post(
                f'{api_constants.BASE_URL}{api_constants.UPDATE_PHYSIQUE_DETAILS_ENDPOINT}', json={"height": value})
        elif type == constants.WEIGHT:
            response = requests.post(
                f'{api_constants.BASE_URL}{api_constants.UPDATE_PHYSIQUE_DETAILS_ENDPOINT}', json={"weight": value})
    except ValueError:
        logger.error(
            f"Height/weight is not a decimal value - {value}")
        bot.send_message(
            message.chat.id, 'Invalid input.', reply_markup=types.ReplyKeyboardRemove())
    except requests.exceptions.ConnectionError:
        logger.error(
            f"Updating {type} API request connection error")
        bot.send_message(
            message.chat.id, 'An unexpected error occured.', reply_markup=types.ReplyKeyboardRemove())
        return

    # Check for successful response
    if response.status_code == 201:
        # Send a success message to the bot
        bot.reply_to(message, f"{type} updated successfully.")
    else:
        # Send a server error message to the bot in case of failure
        logger.error(
            f"Height/Weight update API server error for type - {type}")
        bot.send_message(message.chat.id, 'An unexpected error occured.',
                         reply_markup=types.ReplyKeyboardRemove())


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


def handle_investments_type(message):
    if message.text in [constants.STOCKS, constants.MUTUTAL_FUNDS, constants.CRYPTO]:
        type = message.text
        bot.send_message(
            message.chat.id, 'Enter total amount invested.', reply_markup=types.ReplyKeyboardRemove())
        bot.register_next_step_handler(
            message, handle_investments_update, type)
    elif message.text == constants.CANCEL:
        bot.reply_to(message, "Okay.")
    else:
        logger.error(
            f"Investment type invalid input received - {message.text}")
        bot.reply_to(message, "Invalid input.")


def handle_investments_update(message, investment_type):
    try:
        if message.text.isnumeric():
            if investment_type == constants.STOCKS:
                response = requests.post(
                    f'{api_constants.BASE_URL}{api_constants.UPDATE_INVESTMENT_ENDPOINT}', json={"stocks": message.text})
            elif investment_type == constants.MUTUTAL_FUNDS:
                response = requests.post(
                    f'{api_constants.BASE_URL}{api_constants.UPDATE_INVESTMENT_ENDPOINT}', json={"mutual_funds": message.text})
            elif investment_type == constants.CRYPTO:
                response = requests.post(
                    f'{api_constants.BASE_URL}{api_constants.UPDATE_INVESTMENT_ENDPOINT}', json={"crypto": message.text})
        else:
            logger.error(
                f"Invalid investment amount - {message.text}")
            bot.reply_to(message, "Invalid amount.")
    except requests.exceptions.ConnectionError:
        bot.send_message(
            message.chat.id, 'An unexpected error occured.', reply_markup=types.ReplyKeyboardRemove())
        return

    # Check for successful response
    if response.status_code in [200, 201]:
        # Log the appropriate message
        message = "Investment created successfully." if response.status_code == 201 else "Investment updated/created successfully."
        logger.info(message)
        # Send a success message to the bot
        success_message = 'Investment updated successfully.'
    else:
        # Send a server error message to the bot in case of failure
        logger.error(
            f"Create or update investment API server error for innvestment type - {investment_type}")
        success_message = 'Server error.'

    # Send the message with a ReplyKeyboardRemove to clear any previous keyboards
    bot.send_message(message.chat.id, success_message,
                     reply_markup=types.ReplyKeyboardRemove())


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
