(type (Ext {:key key :value value})
  {key value})

(type (Foo) {
  a Int
  b Int
})

(Foo)

(Ext {:key (| :foo :bar) :value Int})

(type (Result :ok ok :error error)
  (Variant
    :ok ok
    :error error
  ))



  (Variant
    :empty {}
    :pair {:head a :tail (LinkedList a)
  ))

(module schema.std
  (define (Result :ok ok :error error)
    :ok ok
    :error error
  )

  (define (List a)
    :empty {}
    :pair {:head a :tail (List a))

  (define pair
    (the
      (Lambda 
        a
        :& (List a)
        (List a))
      (lambda (head ...etc)
        {:pair {:head head :tail (:tail etc)}})))

    (define unit
      (the
        (Lambda a (List a))
        (lambda item {:pair {:head item :tail {:empty {} })))
  
  (define first
    (the
      (Lambda (List a) (Result a String))
      (lambda (list)
        (if (:empty? list)
          (Result :error "List is empty")
          (:head (:pair list))
          ))))

    (first (pair 1 :& (unit 2)))
    
  )



(module web3.storage
  (define CARLink (Link : CAR}))

  (define Root :archive/root CARLink)
  (define Shards :archive/shards [CARLink])

  (define Archive {...Root ...Shards})

  (define :list/head )
  (define Pair {: a :tail (Pair :head a))

  (define LinkedList
    :empty {}
    :pair (Pair : a})
  )

  (define Result
    :ok ok
    :error error)

  (Result :error "Oops")

  (define Vector
    {:x Int :y Int})

  (define pos (Vector {:x 1 :y 2}))
  (expect (= (:x pos) 1))
  (define new-pos {...pos :x 3})
  
  (LinkedList 1 :tail (LinkedList 2))
  
  )
  

