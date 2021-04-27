from flask import Flask, request, jsonify, redirect
from signalwire.rest import Client as signalwire_client
import requests
import ast
import os
import siaskynet as skynet

ALLOWED_EXTENSIONS = set(['txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif'])
client = signalwire_client("SIGNAL_WIRE_PROJECT_ID", "SIGNAL_WIRE_PROJECT_API_TOKEN",
                           signalwire_space_url='YOUR_SIGNAL_WIRE_SPACE_URL')

app = Flask(__name__)

UPLOAD_FOLDER = 'YOUR/UPLOAD/FOLDER/PATH'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def hello_world():
    from_number = request.args.get('From')  # phone number
    message_body = request.args.get('Body')  # sms body

    if message_body.lower() == 'check balance':
        user_balance = process_post(from_number)
        send_sms(from_number, user_balance)

    if message_body.lower() == 'send money':
        send_sms(from_number, 'Please provide a comma separated list of the destination address, amount, pin')

    if len(message_body.lower()) > 20:
        process_send_money(from_number, message_body)

    if message_body.lower() == 'get id':
        send_sms(from_number, 'let\'s get you your id')
        skynet_operations_read_data(from_number)

    return 'success'


@app.route('/post_data')
def process_post(from_number):
    trim_number = from_number[2:]
    clean_number = repr(str(trim_number))
    r = requests.post('NGROK/JS-APP/URL/balance', data={'phone': trim_number})
    balance = r.text
    checked_balance = ast.literal_eval(balance)
    final_balance = checked_balance.get('balance')

    if r.status_code != 200:
        print("Error:", r.status_code)
    return final_balance


def send_sms(number, data):
    client.messages.create(from_='YOUR-SIGNAL-WIRE-NUMBER-HERE', body=data, to=number)


@app.route('/post_data_send_xlm')
def process_send_money(from_number, message_body):
    trim_number = from_number[2:]
    send_money_body = message_body.split(',')
    address = send_money_body[0]
    amount = send_money_body[1]
    pin = send_money_body[2]
    r = requests.post('NGROK/JS-APP/URL/sendXLM',
                      data={'phone': trim_number, 'address': address, 'amount': amount, 'pin': pin})
    if r.status_code != 200:
        print("Error:", r.status_code)

    if r.status_code == 200:
        send_sms(from_number, 'Transaction successful, thanks for using our platform!')
    print(r.text)

    return


@app.route("/im_size", methods=['POST'])
def process_image():
    file = request.files['uploads']
    folder_name_from_phone_number = str(request.values.get('phone'))
    directory = folder_name_from_phone_number
    parent_dir = 'YOUR/UPLOAD/FOLDER/PATH'
    path = os.path.join(parent_dir, directory)
    os.mkdir(path)
    print("Directory '%s' created" % directory)
    print(path, 'path')
    filename = file.filename
    file.save(os.path.join(path, filename))
    resp = jsonify({'message': 'File successfully uploaded'})
    resp.status_code = 201
    skynet_operations_load_data(directory)

    return resp


def skynet_operations_load_data(from_number):
    path = 'YOUR/UPLOAD/FOLDER/PATH' + from_number
    
    def find_files():
        files = os.listdir(path)

        for f in files:
            print(f)
        return f

    data = find_files()

    client = skynet.SkynetClient()

    skylink = client.upload_file(path + '/' + data)

    print("Upload successful, skylink: " + skylink)

    web_url_sky_link = 'https://siasky.net/' + skylink[6:]

    f = open(path + '/' + from_number + '.txt', "a")
    f.write(str(web_url_sky_link))
    f.close()

    return web_url_sky_link


def skynet_operations_read_data(from_number):
    path = 'YOUR/UPLOAD/FOLDER/PATH' + from_number[2:]
    print(path)
    f = open(path + '/' + from_number[2:] + '.txt', "r")
    link = f.read()
    print(link)
    return send_sms(from_number, link)
