# FastAPI Gzip Test

# Result

|   Raw JSON  |   Gzip    | without GZP |
|------------:|----------:|------------:|
|   26.13MB   |   3.81MB  |   26.13MB   |

## Run

### With Gzip Middleware

```
python app_gzip.py
```

### Without Gzip Middleware

```
python app_non_gzip.py
```

## Test
```
curl -s -H 'Accept-Encoding: gzip' http://0.0.0.0:8000 | wc -c | awk '{print $1/1000000}' | awk '{printf "%.2f MB\n", $1}
```

### Explanation

`curl -s -H 'Accept-Encoding: gzip' http://0.0.0.0:8000`: This part of the command uses curl to send a HTTP request to the server running on http://0.0.0.0:8000. The `-s` option tells curl to operate in silent mode, which means it won't display progress information or error messages. The `-H 'Accept-Encoding: gzip'` part sets a HTTP header indicating that the client can accept gzip-encoded data. This is a way to tell the server that it can send the response compressed using gzip to save bandwidth.

`| wc -c`: The pipe (|) takes the output of the previous command and uses it as the input for the next command. wc -c counts the number of bytes in the input it receives. In this case, it's counting the number of bytes in the server's response.

`| awk '{print $1/1000000}'`: This command takes the byte count from the previous command and divides it by 1,000,000. This is a way to convert the byte count into megabytes, since 1 megabyte is approximately 1,000,000 bytes.

`| awk '{printf "%.2f MB\n", $1}'`: This final command takes the output of the previous command (the size of the server's response in megabytes) and formats it as a string with two decimal places followed by "MB". The \n at the end adds a newline character to the end of the string, so that the output will be properly displayed on a new line in the terminal.

