using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace Flower2Flower.Tests.Support;

public static class HttpExtensions
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    public static Task<HttpResponseMessage> PostJson(this HttpClient client, string url, object? body = null)
    {
        return client.PostAsJsonAsync(url, body ?? new { }, Options);
    }

    public static Task<HttpResponseMessage> PutJson(this HttpClient client, string url, object body)
    {
        return client.PutAsJsonAsync(url, body, Options);
    }

    public static Task<HttpResponseMessage> Upload(this HttpClient client, string purpose, string contentType = "image/jpeg", string name = "photo.jpg", byte[]? bytes = null)
    {
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes ?? Enumerable.Range(0, 256).Select(x => (byte)x).ToArray());
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        content.Add(file, "File", name);
        content.Add(new StringContent(purpose), "Purpose");
        return client.PostAsync("/api/v1/files", content);
    }

    public static async Task<JsonNode> Expect(this Task<HttpResponseMessage> call, HttpStatusCode expected = HttpStatusCode.OK)
    {
        using var response = await call;
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == expected, $"Expected {(int)expected} {expected} but got {(int)response.StatusCode} {response.StatusCode}: {body}");
        return Parse(body);
    }

    public static async Task<JsonNode> ExpectAny(this Task<HttpResponseMessage> call)
    {
        using var response = await call;
        return Parse(await response.Content.ReadAsStringAsync());
    }

    public static async Task<string> ExpectError(this Task<HttpResponseMessage> call, HttpStatusCode expected)
    {
        var body = await call.Expect(expected);
        return body is JsonObject obj && obj["message"] is JsonValue message ? message.GetValue<string>() : body.ToJsonString();
    }

    public static async Task ExpectStatus(this Task<HttpResponseMessage> call, HttpStatusCode expected)
    {
        using var response = await call;
        Assert.True(response.StatusCode == expected, $"Expected {(int)expected} but got {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
    }

    public static string Str(this JsonNode node, string key) => node[key]!.GetValue<string>();

    public static string? StrOrNull(this JsonNode node, string key) => node[key]?.GetValue<string>();

    public static int Int(this JsonNode node, string key) => node[key]!.GetValue<int>();

    public static long Long(this JsonNode node, string key) => node[key]!.GetValue<long>();

    public static decimal Dec(this JsonNode node, string key) => node[key]!.GetValue<decimal>();

    public static bool Bool(this JsonNode node, string key) => node[key]!.GetValue<bool>();

    public static Guid Guid(this JsonNode node, string key) => System.Guid.Parse(node[key]!.GetValue<string>());

    public static JsonArray Arr(this JsonNode node, string key) => node[key]!.AsArray();

    public static IEnumerable<JsonNode> Items(this JsonNode node) => (node is JsonArray array ? array : node["items"]!.AsArray()).Select(x => x!);

    private static JsonNode Parse(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return new JsonObject();
        }

        try
        {
            return JsonNode.Parse(body) ?? new JsonObject();
        }
        catch (JsonException)
        {
            return JsonValue.Create(body)!;
        }
    }
}
