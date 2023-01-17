// @see https://github.com/ipld/ipld/blob/015ff80aea78f588b981c6cef7f1e9bd59d31f48/specs/schemas/schema-schema.ipldsch

export interface IPLDSchema {
  types: { [key: TypeName]: Type }
  advanced?: AdvancedDataLayoutMap
}

/**
 * Type names are a simple alias of string.
 * There are some additional rules that should be applied. Type names:
 * - *Must* only contain alphanumeric ASCII characters and underscores
 * - *Must* begin with a capital letter
 * - *Should* avoid more than one connected underscore character,
 *   multiple-underscores may be used for codegen
 */
export type TypeName = string

/**
 * AdvancedDataLayoutName defines the name of an ADL as a string.
 *
 * The same constraints and conventions apply as for TypeName.
 *
 * This identifier is used for keys in the AdvancedDataLayoutMap and also as
 * references to ADLs where the "advanced" representation strategy is used for
 * the types that support it.
 */
export type AdvancedDataLayoutName = string

/**
 * AdvancedDataLayoutMap defines the set of ADLs found within the schema. It
 * maps the name (AdvancedDataLayoutName) to the AdvancedDataLayout, which is
 * currently an empty map.
 */
export type AdvancedDataLayoutMap = {
  [key: AdvancedDataLayoutName]: AdvancedDataLayout
}

export type AdvancedDataLayout = {}

export type Type = Variant<{
  bool: BooleanType
  string: StringType
  bytes: BytesType
  int: IntType
  float: FloatType
  any: AnyType
  unit: UnitType
  link: LinkType
  map: MapType
  list: ListType
  union: UnionType
  enum: EnumType
  struct: StructType
  copy: CopyType
}>

/**
 * TypeKind enumerates all the major kinds of type.
 * Notice this enum's members are the same as the set of strings used as
 * discriminants in the Type union.
 * (Almost! {@link Type} also contains {@link CopyType}, which is a slight outlier.
 * (TypeCopy can be used to define a type, but isn't a type kind itself.))
 *
 * This enum is not actually used elsewhere in the schema-schema,
 * but does correspond to the discriminant values used in the {@link Type} union.
 */
export type TypeKind =
  | 'bool'
  | 'string'
  | 'bytes'
  | 'int'
  | 'float'
  | 'map'
  | 'list'
  | 'link'
  | 'union'
  | 'struct'
  | 'enum'
  | 'unit'
  | 'any'

/**
 * RepresentationKind is similar to TypeKind, but includes only those concepts
 * which exist at the IPLD *Data Model* level.
 *
 * In other words, structs, unions, and enumerations are not present:
 * those concepts are introduced in the IPLD Schema system, and when serialized,
 * all of them must be transformable to one of these representation kinds
 * (e.g. a "struct" TypeKind will usually be transformed to a "map"
 * RepresentationKind; "enum" TypeKind are typically a "string" RepresentationKind;
 * and so on; exactly what RepresentationKind a type definition will have
 * is determined by its representation strategy).
 *
 * RepresentationKind strings are sometimes used to to indicate part of the
 * definition in the details of TypeDefn; for example, they're used describing
 * some of the detailed behaviors of a "kinded"-style union type.
 */
export type RepresentationKind =
  | 'bool'
  | 'string'
  | 'bytes'
  | 'int'
  | 'float'
  | 'map'
  | 'list'
  | 'link'

/**
 * AnyScalar defines a union of the basic non-complex kinds.
 *
 * Useful defining usage of IPLD nodes that do compose from other nodes.
 */
export type AnyScalar = boolean | string | Uint8Array | number

/**
 * Describes a simple boolean type.
 * It has no details.
 */
export type BooleanType = {}

/**
 * Describes a simple string type.
 * It has no details.
 */
export type StringType = {}

/**
 * Describes a simple byte array type.
 */
export type BytesType = {
  representation?: BytesRepresentation
}

/**
 * BytesRepresentation specifies how a TypeDefnBytes is to be serialized. By
 * default it will be stored as bytes in the data model but it may be replaced
 * with an ADL.
 */
export type BytesRepresentation = Variant<{
  bytes: BytesAsBytes
  advanced: AdvancedDataLayoutName
}>

/**
 * BytesAsBytes is the default representation for TypeBytes and will be used
 * implicitly if no representation is specified.
 */
export type BytesAsBytes = {}

/**
 * describes a simple integer numeric type.
 * It has no details.
 */
export type IntType = {}

/**
 * Describes a simple floating point numeric type.
 * It has no details.
 */
export type FloatType = {}

/**
 * Describes a key-value map.
 * The keys and values of the map have some specific type of their own.
 *
 * A constraint on `keyType` is that the referenced type must have a string
 * representation kind. The IPLD Data Model only allows for string keys on maps,
 * so this constraint is imposed here.
 */
export type MapType = {
  // keyType: TypeName
  // valueType: TypeNameOrInlineType
  keyType?: Type
  valueType?: Type
  valueNullable?: boolean // (implicit false)
  representation?: MapRepresentation
}

/**
 * `MapRepresentation` describes how a map type should be mapped onto
 * its IPLD Data Model representation.
 *
 * By default, a map type is also represented as a map in the Data Model,
 * but other representation strategies can be configured
 *
 * Note that the `TypeMap['representation']` field is optional --
 * the default behavior is demarcated by the lack of any of these values.
 */
export type MapRepresentation = Variant<{
  stringpairs: MapAsStringPairs
  listpairs: MapAsListPairs
  advanced: AdvancedDataLayoutName
}>

/**
 * `MapAsStringPairs` describes that a map should be encoded as a
 * string of delimited "k/v" entries, e.g. "k1=v1,k2=v2".
 *
 * The separating delimiter may be specified with "entryDelim", and the k/v
 * delimiter may be specified with "innerDelim". So a "k=v" naive
 * comma-separated form would use an "innerDelim" of "=" and an "entryDelim"
 * of ",".
 *
 * This serial representation is limited: the domain of keys must
 * exclude the "innerDelim" and values and keys must exclude ",".
 * There is no facility for escaping, such as in escaped CSV.
 * This also leads to a further restriction that this representation is only
 * valid for maps whose keys and values may all be encoded to string form
 * without conflicts in delimiter character. It is recommended, therefore,
 * that its use be limited to maps containing values with the basic data
 * model kinds that exclude multiple values (i.e. no maps, lists, and therefore
 * structs or unions).
 */
export type MapAsStringPairs = {
  innerDelim: string
  entryDelim: string
}

/**
 * `MapAsListPairs` describes that a map should be encoded as a list in the IPLD
 * Data Model. This list comprises a sub-list for each entry,
 * in the form: [[k1,v1],[k2,v2]].
 *
 * This representation type is similar to `StructAsTuple` except it includes the
 * keys. This is critical for maps since the keys are not defined in the schema
 * (hence "tuple" representation isn't available for maps).
 */
export type MapAsListPairs = {}

/**
 * `TypeList` describes a list.
 * The values of the list have some specific type of their own.
 */
export type ListType = {
  valueType: TypeNameOrInlineType
  valueNullable: boolean // (implicit false)
  representation?: ListRepresentation
}

/**
 * ListRepresentation describes how a map type should be mapped onto
 * its IPLD Data Model representation.  By default a list is a list in the
 * data model but it may be replaced with an ADL.
 *
 * Note that the `TypeList['representation']` field is optional --
 * the default behavior is demarcated by the lack of any of these values.
 */
export type ListRepresentation = Variant<{
  advanced: AdvancedDataLayoutName
}>

/**
 * TypeLink describes an IPLD link, which is a content-addressable pointer to
 * more data.
 * (Links in IPLD are implemented by CIDs: they're a hash that identifies another another block of data,
 * plus a codec hint for how to parse it into IPLD Data Model).
 *
 * A typed link can optionally state an "expectedType".
 * This provides a mechanism for suggesting what we should expect find
 * if we were to follow the link.
 * (Note that this cannot be strictly enforced by a node or block-level schema
 * validation! But may be enforced elsewhere in an application using a schema,
 * and is generally enforced as soon as possible when traversing typed links.)
 *
 * In the Schema DSL, links are specified with the `&FooBar` syntax --
 * The ampersand character denotes a link, and the rest of the declaration
 * is the name of the expected type for the linked content.
 *
 * If you want the equivalent of untyped links, in the DSL, you can say `&Any`.
 * This is also available in the Prelude, and that type is simply name "Link"
 * (in other words, the Prelude contains `type Link &Any`).
 */

// We modify this type to allow inline definitions
export type LinkType<T = { any: AnyType }> = {
  // expectedType: TypeName //(implicit "Any")

  expectedType: Type
}

/**
 * UnionType describes a union (sometimes called a "sum type", or
 * more verbosely, a "discriminated union", or in yet other literature, a "variant" type).
 *
 * A union is a type that can have a value of several different types, but
 * unlike maps or structs, in a union, only one of those values may be present
 * at a time.
 *
 * Unions can be represented in several significantly different ways:
 * see the documentation of the UnionRepresentation type for details.
 * Also note that there is no default representation for union types --
 * you must _always_ explicitly specify a representation strategy when defining unions!
 */
export type UnionType = {
  members: UnionMember[]
  representation: UnionRepresentation
}

/**
 * UnionMember is a type for identifying the members of a union.
 * Most commonly, this is simply a TypeName string;
 * however, it can also be a `InlineUnionMember`, which is used to allow inline
 * link definitions within a kinded union as a shorthand
 * (rather than requiring all links be declared as a named type before being
 * usable within a union).
 */
export type UnionMember =
  // | string
  // | InlineUnionMember
  // IPLD schema extension
  Type

/**
 * InlineUnionMember is a very similar purpose to `InlineType`, but found
 * specifically within `UnionMember`.
 *
 * It only allows describing a link type (and not maps nor lists, as InlineType
 * does), which is a constraint applied to union membership largely to make sure
 * if there are errors in processing unions, we can make legible messages about
 * it!
 */
export type InlineUnionMember = Variant<{
  link: LinkType
}>

/**
 * UnionRepresentation is a union of all the distinct ways a UnionType's values
 * can be mapped onto a serialized format for the IPLD Data Model.
 *
 * There are six strategies that can be used to encode a union:
 * "keyed", "envelope", "inline", "stringprefix", "bytesprefix", and "kinded".
 *
 * The "keyed", "envelope", and "inline" strategies are all ways to produce
 * representations in a map format, using map keys as type discriminators
 * (some literature may describe this as a "tagged" style of union).
 *
 * The "stringprefix" strategy, only available for unions in which all member
 * types themselves represent as strings in the data model, uses a prefix
 * string as the type discrimination hint (and like the map-oriented strategies,
 * may also be seen as a form of "tagged" style unions).
 *
 * The "bytesprefix" strategy, only available for unions in which all member
 * types themselves represent as bytes in the data model, similar to
 * "stringprefix" but with bytes.
 *
 * The "kinded" strategy can describe a union in which member types have
 * several different representation kinds, and uses the representation kind
 * itself as the type discrimination hint to do so.
 *
 * Note: Unions can be used to produce a "nominative" style of type declarations
 * -- yes, even given that IPLD Schema systems are natively "structural" typing!
 */
export type UnionRepresentation = Variant<{
  kinded: KindedUnionRepresentation
  keyed: KeyedUnionRepresentation
  envelope: EnvelopeUnionRepresentation
  inline: InlineUnionRepresentation
  stringprefix: StringPrefixUnionRepresentation
  bytesprefix: BytesPrefixUnionRepresentation
}>

/**
 * "Kinded" union representations describe a bidirectional mapping between
 * a RepresentationKind and the type which should be the
 * union member decoded when one sees this RepresentationKind.
 *
 * The referenced type must of course produce the RepresentationKind it's
 * matched with!
 */
export type KindedUnionRepresentation<
  RepresentationKind extends string = string
> = {
  [Key in RepresentationKind]: UnionMember
}

/**
 * "Keyed" union representations will encode as a map, where the map has
 * exactly one entry, the key string of which will be used to look up the name
 * of the Type; and the value should be the content, and be of that Type.
 *
 * Note: when writing a new protocol, it may be wise to prefer keyed unions
 * over the other styles wherever possible; keyed unions tend to have good
 * performance characteristics, as they have most "mechanical sympathy" with
 * parsing and deserialization implementation order.
 */
export type KeyedUnionRepresentation = { [key: string]: UnionMember }

/**
 * "Envelope" union representations will encode as a map, where the map has
 * exactly two entries: the two keys should be of the exact strings specified
 * for this envelope representation.  The value for the discriminant key
 * should be one of the strings in the discriminant table.  The value for
 * the content key should be the content, and be of the Type matching the
 * lookup in the discriminant table.
 */
export type EnvelopeUnionRepresentation = {
  discriminantKey: string
  contentKey: string
  discriminantTable: { [Key: string]: UnionMember }
}

/**
 * "Inline" union representations require that all of their members encode
 * as a map, and encode their type info into the same map as the member data.
 * Thus, the map for an inline union may have any number of entries: it is
 * however many fields the member value has, plus one (for the discriminant).
 *
 * All members of an inline union must be struct types and must encode to
 * the map RepresentationKind.  Other types which encode to map (such as map
 * types themselves!) cannot be used: the potential for content values with
 * with keys overlapping with the discriminantKey would result in undefined
 * behavior!  Similarly, the member struct types may not have fields which
 * have names that collide with the discriminantKey.
 *
 * When designing a new protocol, use inline unions sparingly; despite
 * appearing simple, they have the most edge cases of any kind of union
 * representation, and their implementation is generally the most complex and
 * is difficult to optimize deserialization to support.
 */
export type InlineUnionRepresentation = {
  discriminantKey: string
  // discriminantTable: { [Key: string]: TypeName }
  discriminantTable: { [Key: string]: Type }
}

/**
 * UnionRepresentation_StringPrefix describes a union representation for unions
 * whose member types are all strings. Strings used for this representation
 * strategy use the first characters as the discriminator, and the subsequent
 * characters as the discriminated type's value.
 *
 * There is currently no limitation on prefix length, other than needing to be
 * at least one character. Nor is there a requirement that they all be of the
 * same length, although they must all represent unique prefixes.
 *
 * stringprefix is an invalid representation for any union that contains a type
 * that does not have a string representation.
 */
export type StringPrefixUnionRepresentation = {
  // prefixes: { [Key: string]: TypeName }
  prefixes: { [Key: string]: { string: StringType } }
}

/**
 * UnionRepresentation_BytesPrefix describes a union representation for unions
 * whose member types are all bytes. It is encoded to a byte array whose
 * first bytes are the discriminator and subsequent bytes form the discriminated
 * type.
 *
 * Discriminators are represented as hexadecimal strings. There is currently
 * no limitation on their length, other than needing to be at least one byte.
 * Nor is there a requirement that they all be of the same length, although
 * they must all represent unique prefixes.
 *
 * Only valid, upper-case, hexadecimal strings representing at least one byte
 * are allowed.
 *
 * bytesprefix is an invalid representation for any union that contains a type
 * that does not have a bytes representation.
 */
export type BytesPrefixUnionRepresentation = {
  // prefixes: { [Key: HexString]: TypeName }
  prefixes: { [Key: HexString]: Type }
}

/**
 * HexString is an alias for string, to denote and clarify that it's not a
 * regular freetext string.
 *
 * It's seen used in the `BytesPrefixUnionRepresentation` type.
 * (We use hexadecimal strings in the schema-schema in some places, even though
 * we could've used bytes types, because the schema DSL also uses hex strings,
 * and consistency (and, the ability to keep the schema-schema in plain JSON!)
 * is valuable.)
 */
export type HexString = string

/**
 * StructType describes a type which has a group of fields of varying Type.
 * Each field has a name, which is used to access its value, similarly to
 * accessing values in a map.
 *
 * The most typical representation of a struct is as a map, in which case field
 * names also serve as the the map keys (though this is a default, and details
 * of this representation may be configured; and other representation strategies
 * also exist).
 */
export type StructType = {
  fields: StructFields
  representation: StructRepresentation
}

export type StructFields = { [Key: FieldName]: StructField }
/**
 * FieldName is an alias of string.
 *
 * There are some additional rules that should be applied:
 *   - Field names should by convention begin with a lower-case letter;
 *   - Field names must be all printable characters (no whitespace);
 *   - Field names must not contain punctuation other than underscores
 *     (dashes, dots, etc.).
 *
 * Field names are strings meant for human consumption at a local scope.
 * When making a Schema, note that the FieldName is the key of the map:
 * a FieldName must be unique within the Schema.
 */
export type FieldName = string

/**
 * StructField describes the properties of each field declared by a StructType.
 *
 * StructField contains properties similar to MapType -- namely, it describes
 * a content type (as a TypeNameOrInlineType -- it supports inline definitions)
 * -- and has a boolean property for whether or not the value is permitted to be
 * null.
 *
 * In addition, StructField also has a property called "optional".
 * An "optional" field is one which is permitted to be absent entirely.
 * This is distinct from "nullable": a field can be optional=false and
 * nullable=true, in which case it's an error if the key is missing entirely,
 * but null is of course valid.  Conversely, if a field is optional=true and
 * nullable=false, it's an error if the field is present and assigned null, but
 * fine for a map to be missing a key of the field's name entirely and still be
 * recognized as this struct.
 * (The specific behavior of optionals may vary per StructRepresentation.)
 *
 * Note that the 'optional' and 'nullable' properties are not themselves
 * optional... however, in the IPLD serial representation of schemas, you'll
 * often see them absent from the map encoding a StructField.  This is because
 * these fields are specified to be implicitly false.
 *
 * Implicits in a map representation of a struct mean that those entries may
 * be missing from the map encoding... but unlike with "optional" fields, there
 * is no "undefined" value; absence is simply interpreted as the value specified
 * as the implicit.
 * (With implicit fields, an explicitly encoded implicit value is actually an
 * error instead!)  "Optional" fields give rise to N+1 cardinality logic,
 * just like "nullable" fields; "implicit" fields *do not*.
 */
export type StructField = {
  // type: TypeNameOrInlineType
  type: Type
  optional: boolean // (implicit false)
  nullable: boolean // (implicit false)
}

/**
 * TypeNameOrInlineType is a union of either TypeName or an InlineType.
 * It's used for the value type in the recursive types (maps, lists, and the
 * fields of structs), which allows the use of InlineType in any of those
 * positions.
 *
 * TypeNameOrInlineType is simply a TypeName if the kind of data is a string;
 * this is simple and common case.
 * If the data is a map, then it requires further recognition as an InlineType.
 *
 * Note that TypeNameOrInlineType isn't used to describe *keys* in the recursive
 * types that have them (maps, structs) -- recursive types in keys would not
 * lend itself well to serialization!
 *
 * TypeNameOrInlineType also isn't used to describe members in Unions -- this
 * is a choice aimed to limit syntactical complexity (both at type definition
 * authoring time, as well as for the sake of error messaging during
 * typechecking).
 */
export type TypeNameOrInlineType = TypeName | InlineType

/**
 * InlineType represents a declaration of an anonymous type of one of the simple
 * recursive kinds (e.g. map or list) which is found "inline" in another type's definition.
 * InlineDefn also allows description of anonymous but typed links for similar reasons.
 * InlineDefn is the more complex option of the TypeNameOrInlineDefn union.
 *
 * Note that the representation of this union -- the use of a keyed representation,
 * as well as the keywords for its members -- align exactly with those
 * in the TypeNameOrInlineDefn union.  Technically, this isn't a necessary property (in that
 * nothing would break if that sameness was violated) but it's awfully nice for
 * sanity; what we're saying here is that the representation of the types in an
 * InlineDefn should look *exactly the same* as the top-level type declarations...
 * it's just that within an InlineDefn, we're restricted to a subset of the members.
 */
export type InlineType = Variant<{
  map: MapType
  list: ListType
  link: LinkType
}>

/**
 * StructRepresentation describes how a struct type should be mapped onto
 * its IPLD Data Model representation.
 *
 * The default representation strategy for struct types is a map,
 * with the struct's field names as keys.
 * However, that can be configured.
 * For example, the map representation can be configured with
 * directives to use different keys in the representation form;
 * or, configured to consider some fields as having values which should be seen as the implicit value for that field,
 * meaning the entire field shouldn't get an entry in the representation map if that value is found in that field.
 * Or, wholly different representation strategies can be used
 * (such as the tuple strategy, which results in a data model list kind,
 * or stringjoin, which results a data model string kind!).
 */
export type StructRepresentation = Variant<{
  map: StructAsMap
  tuple: StructAsTuple
  stringpairs: StructAsStringPairs
  stringjoin: StructAsStringJoin
  listpairs: StructAsListPairs
}>

/**
 * StructRepresentation_Map describes a way to map a struct type onto a map
 * representation. Field serialization options may optionally be configured to
 * enable mapping serialized keys using the 'rename' option, or implicit values
 * specified where the field is omitted from the serialized form using the
 * 'implicit' option.
 *
 * See StructRepresentation_Map_FieldDetails for details on the 'rename' and
 * 'implicit' options.
 */
export type StructAsMap = {
  fields?: StructAsMapFields }
}

export type StructAsMapFields = { [Key: FieldName]: StructAsMapFieldDetails }

/**
 * Describes additional properties of a
 * struct field when represented as a map.  For example, fields may be renamed,
 * or implicit values associated.
 *
 * If an implicit value is defined, then during marshalling, if the actual value
 * is the implicit value, that field will be omitted from the map; and during
 * unmarshalling, correspondingly, the absence of that field will be interpreted
 * as being the implicit value.
 *
 * Note that fields with implicits are distinct from fields which are optional!
 * The cardinality of membership of an optional field is is incremented:
 * e.g., the cardinality of "fieldname Bool" is 2; "fieldname optional Bool" is
 * membership cardinality *3*, because it may also be undefined.
 * By contrast, the cardinality of membership of a field with an implicit value
 * remains unchanged; there is serial state which can map to an undefined value.
 *
 * Note that 'rename' supports exactly one string, and not a list: this is
 * intentional.  The rename feature is meant to allow serial representations
 * to use a different key string than the schema type definition field name;
 * it is not intended to be used for migration purposes.
 */
export type StructAsMapFieldDetails = {
  rename?: string
  implicit?: AnyScalar
}

/**
 * Describes a way to map a struct type into a list representation.
 *
 * Tuple representations are less flexible than map representations:
 * field order can be specified in order to override the order defined
 * in the type, but optionals and implicits are not (currently) supported.
 * A `fieldOrder` list must include quoted strings (FieldName is a string
 * type) which are coerced to the names of the struct fields. e.g.:
 *   fieldOrder ["Foo", "Bar", "Baz"]
 */
export type StructAsTuple = {
  fieldOrder?: StructFieldOrder
}

export type StructFieldOrder = [FieldName, ...FieldName[]]

/**
 * Describes that a struct should be encoded
 * as a string of delimited "k/v" entries, e.g. "k1=v1,k2=v2".
 * The separating delimiter may be specified with "entryDelim", and the k/v
 * delimiter may be specified with "innerDelim". So a "k=v" naive
 * comma-separated form would use an "innerDelim" of "=" and an "entryDelim"
 * of ",".
 *
 * Serialization a struct with stringpairs works the same way as serializing
 * a map with stringpairs and the same character limitations exist. See
 * MapRepresentation_StringPairs for more details on these limitations.
 */
export type StructAsStringPairs = {
  innerDelim: string
  entryDelim: string
}

/**
 * StructRepresentation_StringJoin describes a way to encode a struct to
 * a string in the IPLD Data Model. Similar to tuple representation, the
 * keys are dropped as they may be inferred from the struct definition.
 * values are concatenated, in order, and separated by a "join" delimiter.
 * For example, specifying ":" as the "join": "v1,v2,v3".
 *
 * stringjoin is necessarily restrictive and therefore only valid for structs
 * whose values may all be encoded to string form without conflicts in "join"
 * character. It is recommended, therefore, that its use be limited to structs
 * containing values with the basic data model kinds that exclude multiple
 * values (i.e. no maps, lists, and therefore structs or unions).
 */
export type StructAsStringJoin = {
  join: string
  fieldOrder?: StructFieldOrder
}



/**
 * StructAsListPairs describes that a struct, should be encoded as
 * a list in the IPLD Data Model. This list comprises a sub-list for each
 * entry, in the form: [[k1,v1],[k2,v2]].
 *
 * This representation type encodes in the same way as
 * {@link MapAsTuple}. It is also similar to {@link StructAsTuple} except it
 * includes the keys in nested lists. A tuple representation for a struct will
 * encode more compact than listpairs.
 */
export type StructAsListPairs = {}

/**
 * `EnumType` describes a type which has a known, pre-defined set of possible
 * values. Each of the member values is named by a string (of {@link EnumMember}
 * type).
 *
 * Enums can have either string or int-based representations. Integer and string
 * values (for int and string representations respectively) are provided in
 * parens in the DSL. Where the string used in serialization is the same as the
 * {@link EnumMember}, it may be omitted. For int representation enums, all int
 * values are required.
 */
export type EnumType = {
  members: [EnumMember, ...EnumMember[]]
  representation: EnumRepresentation
}

/**
 * `EnumMember` is a string that that names a member of an Enum type.
 *
 * The range of valid values for an `EnumMember` are the same as for
 * {@link TypeName} but without the convention of an uppercase first character.
 * Capitalization is left up to the discretion of the schema writer.
 */
export type EnumMember = string

/**
 * `EnumRepresentation` describes how an enum type should be mapped onto
 * its IPLD Data Model representation. By default an enum is represented as a
 * string kind but it may also be represented as an int kind.
 */
export type EnumRepresentation = Variant<{
  string: EnumAsString
  int: EnumAsInt
}>

/**
 * `EnumAsString` describes the way an enum is represented as a
 * string in the data model. By default, the strings used as {@link EnumMember}
 * will be used at the serialization. A custom string may be provided
 * (with `Foo ("x")` in the DSL) which will be stored here in the representation
 * block. Missing entries in this map will use the default.
 */
export type EnumAsString = { [Key: EnumMember]: string }

/**
 * `EnumAsInt` describes the way an enum is represented as an int in the data
 * model. A mapping of names to ints is required to perform the
 * conversion from int to enum value. In the DSL, int values _must_ be provided
 * for each {@link EnumMember} (with `Foo ("100")`, those are stored here.
 */
export type EnumAsInt = { [Key: EnumMember]: Int }

export type Int = number

/**
 * `UnitType` describes a type which contains no data at all (other than that
 * fact of its existence). (If this seems strange, consider that the cardinality
 * of a bool type is 2; the cardinality of a unit type is simply 1.)
 */
export type UnitType = {
  representation: UnitRepresentation
}

/**
 * `UnitRepresentation` is an enum for describing how a `UnitType` should be
 * represented in the data model.
 *
 * Unit types are commonly seen represented in several ways.
 * A null token is a common one.
 * A true token is sometimes seen (especially, when people encode "sets" in json:
 * often this will be seen as a map where the values are keys and the map values are 'true').
 * Also, an empty map can be a useful unit value;
 * an empty map accurately communicates a lack of data.
 * (The emptymap strategy can be a particularly interesting choice if you want to
 * have a schema that is evolvable in the future to start using a struct or map
 * in the same place as the unit type currently stands, while having older documents
 * continue to be parsable by the evolved schema.)
 *
 * Unlike many of the other representation information types seen in the schema-schema,
 * this one is just an enum, rather than being a union.
 * That's because there's no possibility of every needing to annotate more
 * customization onto values in the unit type... because there are no possible
 * values in the unit type.
 *
 * Note that there is no discernible logical difference between
 * `type Foo struct {}` and `type Foo unit representation emptymap`;
 * only that the latter can be said to be a more explicit description of intent.
 * Both will result in identical representations, and both have identical cardinality (which is 1).
 */
export type UnitRepresentation = null | true | false | {} // emptymap

/**
 * `AnyType` describes a type which can contain data of any kind.
 * It's essentially an escape valve; it says "we don't really know what lies
 * beyond here".
 *
 * The type-level data model kind of an "any" type can be anything;
 * it depends on what the inhabitant value is.
 * The representation-level kind can similarly be anything;
 * it will match whatever the type-level kind is.
 *
 * It is not possible to regain useful types on deeper values after using an 'any' type;
 * from then on, the rest of the data is locked in on having exactly that 'any' type,
 * and having no further ability to have separate type-level and representation-level behaviors.
 *
 * 'any' was introduced as a typekind after discovering it is not possible
 * to emulate its behavior by constructing a union; see
 * https://github.com/ipld/specs/issues/318 for some discussion of this.
 */
export type AnyType = {}

/**
 * `CopyType` describes a special "copy" unit that indicates that a type name
 * should copy the type descriptor of another type. `TypeCopy` does not redirect
 * a name to another type. Instead, it copies the entire type definition and
 * assigns it to another type.
 *
 * The DSL defines a `CopyType` as `type NewThing = CopiedThing`, where
 * "CopiedThing" refers to a `type` defined elsewhere in a schema and is not
 * one of `TypeKind` or an inline type descriptor (`{}`, `[]`, `&`).
 */
export type CopyType = {
  fromType: TypeName
}

/**
 * TS Utility type for "keyed" union representation. It is a workaround for TS
 * inference which refines types on discriminant field. For example following
 * code fails to type check in TS
 *
 * @example
 * ```ts
 * type Result<T, X> =
 *   | { ok: T }
 *   | { error: X }
 *
 * const demo = (result: Result<string, Error>) => {
 *   if (result.ok) {
 *   //  ^^^^^^^^^ Property 'ok' does not exist on type '{ error: Error; }`
 *   }
 * }
 * ```
 *
 * While code utilizing this type is inferred as expected:
 *
 * ```ts
 * type Result2<T, X> = KeyedUnion<
 *   | { ok: T }
 *   | { error: X }
 * >
 *
 * const demo = (result: Result<string, Error>) => {
 *   if (result.ok) {
 *     result.ok.toUpperCase()
 *   }
 * }
 * ```
 */
export type ToKeyedUnion<T> = { [K in keyof T]?: never } & T

export type Variant<U extends { [Key: string]: unknown }> = {
  [Key in keyof U]: { [K in Exclude<keyof U, Key>]?: never } & {
    [K in Key]: U[Key]
  }
}[keyof U]
